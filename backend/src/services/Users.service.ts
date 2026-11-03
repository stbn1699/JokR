import {type LinkedIdentity, UsersRepository} from "../repository/Users.repository.js";
import type {User} from "../models/User.model.js";
import bcrypt from "bcrypt";
import type {NewUser} from "../models/NewUser.model.js";
import {type PublicUser, toPublicUser} from "../models/PublicUser.model.js";
import {config} from "../config.js";
import {type ExternalProfile, type Provider, usernameFromDisplayName} from "./oauth.js";

/*
 * Service métier pour les utilisateurs
 * - register : hash le mot de passe puis crée l'utilisateur via le repository
 * - authenticate : vérifie les identifiants (email/username + password)
 * - loginWithProfile / registerWithProfile / linkProfile : connexion avec Google / Discord
 *
 * Remarques :
 * - `bcrypt.hash` utilise config.saltRounds (variable SALTROUNDS, 10 par défaut)
 * - Les mots de passe stockés sont déjà hashés et ne doivent pas être exposés
 * - Un joueur inscrit avec Google / Discord n'a pas de mot de passe (password = null)
 */

// 23505 = violation de contrainte UNIQUE dans Postgres
function uniqueViolation(err: unknown): string | null {
    const e = err as { code?: string; constraint?: string };
    return e.code === "23505" ? e.constraint ?? "" : null;
}

export type MeProfile = PublicUser & {
    isAdmin: boolean;
    hasPassword: boolean;
    linkedAccounts: { provider: string; displayName: string | null }[];
};

export class UsersService {
    constructor(
        private repo: UsersRepository,
    ) {
    }

    // Inscription : hash du mot de passe avant insertion
    // Lève UserAlreadyExistsError si le pseudo ou l'email est déjà pris
    async register(user: NewUser): Promise<PublicUser> {
        // bcrypt attend un nombre de tours (number) : une string serait prise pour un sel
        const doubleHashed = await bcrypt.hash(user.password, config.saltRounds);
        // Email déjà utilisé, même avec d'autres majuscules (ou par un compte Google / Discord)
        if (await this.repo.findByEmail(user.email)) throw new UserAlreadyExistsError();
        try {
            const created = await this.repo.create({...user, password: doubleHashed});
            return toPublicUser(created);
        } catch (err) {
            if (uniqueViolation(err) !== null) throw new UserAlreadyExistsError();
            throw err;
        }
    }

    // Authentification : recherche par email ou username puis compare le hash
    async authenticate(identifier: string, password: string): Promise<User | null> {
        const user = identifier.includes('@') ? await this.repo.findByEmail(identifier) : await this.repo.findByUsername(identifier);
        if (!user?.password) return null;
        const ok = await bcrypt.compare(password, user.password);
        return ok ? user : null;
    }

    // ---------- Google / Discord ----------

    // Joueur déjà lié à ce compte externe, ou dont l'email (vérifié) correspond : on le lie au passage.
    // null : aucun compte, il faut choisir un pseudo (registerWithProfile)
    async loginWithProfile(profile: ExternalProfile): Promise<User | null> {
        const linked = await this.repo.findByIdentity(profile.provider, profile.providerUserId);
        if (linked) {
            await this.repo.refreshIdentity(profile);
            return linked;
        }
        if (!profile.email) return null;
        const byEmail = await this.repo.findByEmail(profile.email);
        if (!byEmail) return null;
        try {
            await this.repo.addIdentity(byEmail.id, profile);
        } catch (err) {
            // Le joueur a déjà un autre compte de ce fournisseur : on ne remplace pas celui qu'il a choisi
            if (uniqueViolation(err) !== null) throw new ProviderAlreadyLinkedError();
            throw err;
        }
        return byEmail;
    }

    // Première connexion : crée le compte avec le pseudo choisi
    async registerWithProfile(username: string, profile: ExternalProfile, avatar?: string): Promise<User> {
        // l'email n'est gardé que s'il n'appartient à personne (il sert aussi à se connecter)
        const email = profile.email && !await this.repo.findByEmail(profile.email) ? profile.email : null;
        try {
            return await this.repo.createWithIdentity(username, email, profile, avatar);
        } catch (err) {
            const constraint = uniqueViolation(err);
            if (constraint === null) throw err;
            // Compte externe créé entre-temps (double clic) : on ne crée pas de doublon
            if (constraint.startsWith("user_identities")) throw new IdentityTakenError();
            throw new UserAlreadyExistsError();
        }
    }

    // Pseudo libre proposé à partir du nom chez le fournisseur
    async suggestUsername(profile: ExternalProfile): Promise<string> {
        const base = usernameFromDisplayName(profile.displayName);
        if (!await this.repo.findByUsername(base)) return base;
        for (let i = 0; i < 5; i++) {
            const candidate = `${base.slice(0, 26)}${Math.floor(1000 + Math.random() * 9000)}`;
            if (!await this.repo.findByUsername(candidate)) return candidate;
        }
        return base;
    }

    // Lie un compte externe au joueur connecté (depuis le profil)
    async linkProfile(userId: string, profile: ExternalProfile): Promise<void> {
        const owner = await this.repo.findByIdentity(profile.provider, profile.providerUserId);
        if (owner) {
            if (owner.id === userId) return;
            throw new IdentityTakenError();
        }
        try {
            await this.repo.addIdentity(userId, profile);
        } catch (err) {
            if (uniqueViolation(err) !== null) throw new ProviderAlreadyLinkedError();
            throw err;
        }
    }

    // false si c'était le seul moyen de se connecter (pas de mot de passe ni d'autre compte lié)
    async unlinkProvider(userId: string, provider: Provider): Promise<boolean> {
        const user = await this.repo.findByUuid(userId);
        if (!user) return false;
        const identities = await this.repo.listIdentities(userId);
        const others = identities.filter(i => i.provider !== provider);
        if (!user.password && others.length === 0) return false;
        await this.repo.removeIdentity(userId, provider);
        return true;
    }

    // ---------- compte ----------

    // Lecture par UUID
    async findByUuid(uuid: string): Promise<User | undefined> {
        return this.repo.findByUuid(uuid);
    }

    // Vérifie le mot de passe d'un joueur connecté
    private async checkPassword(user: User, password: string): Promise<boolean> {
        return !!user.password && await bcrypt.compare(password, user.password);
    }

    async changeAvatar(userId: string, avatar: string): Promise<void> {
        await this.repo.updateAvatar(userId, avatar);
    }

    // false si le mot de passe actuel est incorrect.
    // Un joueur sans mot de passe (Google / Discord) en définit un sans donner l'actuel.
    async changePassword(userId: string, currentPassword: string | undefined, newPassword: string): Promise<boolean> {
        const user = await this.repo.findByUuid(userId);
        if (!user) return false;
        if (user.password && !await this.checkPassword(user, currentPassword ?? "")) return false;
        await this.repo.updatePassword(userId, await bcrypt.hash(newPassword, config.saltRounds));
        return true;
    }

    // false si la confirmation est incorrecte : le mot de passe, ou le pseudo pour un joueur qui n'en a pas
    async deleteAccount(userId: string, confirmation: { password?: string | undefined; username?: string | undefined }): Promise<boolean> {
        const user = await this.repo.findByUuid(userId);
        if (!user) return false;
        const ok = user.password
            ? await this.checkPassword(user, confirmation.password ?? "")
            : confirmation.username === user.username;
        if (!ok) return false;
        await this.repo.delete(userId);
        return true;
    }

    async getByUserId(userId: string): Promise<PublicUser | undefined> {
        const user = await this.findByUuid(userId);
        return user ? toPublicUser(user) : undefined;
    }

    // Profil du joueur connecté : profil public + accès administrateur + moyens de connexion
    async getMe(userId: string): Promise<MeProfile | undefined> {
        const user = await this.findByUuid(userId);
        if (!user) return undefined;
        const identities: LinkedIdentity[] = await this.repo.listIdentities(userId);
        return {
            ...toPublicUser(user),
            isAdmin: user.is_admin === true,
            hasPassword: user.password !== null,
            linkedAccounts: identities.map(i => ({provider: i.provider, displayName: i.display_name})),
        };
    }
}

export class UserAlreadyExistsError extends Error {
    constructor() {
        super("Username or email already in use");
    }
}

// Ce compte Google / Discord est déjà lié à un autre joueur
export class IdentityTakenError extends Error {
}

// Le joueur a déjà lié un autre compte de ce fournisseur
export class ProviderAlreadyLinkedError extends Error {
}
