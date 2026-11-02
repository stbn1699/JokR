import {UsersRepository} from "../repository/Users.repository.js";
import type {User} from "../models/User.model.js";
import bcrypt from "bcrypt";
import type {NewUser} from "../models/NewUser.model.js";
import {type PublicUser, toPublicUser} from "../models/PublicUser.model.js";
import {config} from "../config.js";

/*
 * Service métier pour les utilisateurs
 * - register : hash le mot de passe puis crée l'utilisateur via le repository
 * - authenticate : vérifie les identifiants (email/username + password)
 *
 * Remarques :
 * - `bcrypt.hash` utilise config.saltRounds (variable SALTROUNDS, 10 par défaut)
 * - Les mots de passe stockés sont déjà hashés et ne doivent pas être exposés
 */
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
        try {
            const created = await this.repo.create({...user, password: doubleHashed});
            return toPublicUser(created);
        } catch (err) {
            // 23505 = violation de contrainte UNIQUE dans Postgres
            if ((err as { code?: string }).code === "23505") throw new UserAlreadyExistsError();
            throw err;
        }
    }

    // Authentification : recherche par email ou username puis compare le hash
    async authenticate(identifier: string, password: string): Promise<User | null> {
        const user = identifier.includes('@') ? await this.repo.findByEmail(identifier) : await this.repo.findByUsername(identifier);
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.password);
        return ok ? user : null;
    }

    // Lecture par UUID
    async findByUuid(uuid: string): Promise<User | undefined> {
        return this.repo.findByUuid(uuid);
    }

    // Vérifie le mot de passe d'un joueur connecté
    private async checkPassword(userId: string, password: string): Promise<boolean> {
        const user = await this.repo.findByUuid(userId);
        return !!user && await bcrypt.compare(password, user.password);
    }

    // false si le mot de passe actuel est incorrect
    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
        if (!await this.checkPassword(userId, currentPassword)) return false;
        await this.repo.updatePassword(userId, await bcrypt.hash(newPassword, config.saltRounds));
        return true;
    }

    // false si le mot de passe est incorrect
    async deleteAccount(userId: string, password: string): Promise<boolean> {
        if (!await this.checkPassword(userId, password)) return false;
        await this.repo.delete(userId);
        return true;
    }

    async getByUserId(userId: string): Promise<PublicUser | undefined> {
        const user = await this.findByUuid(userId);
        return user ? toPublicUser(user) : undefined;
    }

    // Profil du joueur connecté : profil public + accès administrateur
    async getMe(userId: string): Promise<(PublicUser & { isAdmin: boolean }) | undefined> {
        const user = await this.findByUuid(userId);
        return user ? {...toPublicUser(user), isAdmin: user.is_admin === true} : undefined;
    }
}

export class UserAlreadyExistsError extends Error {
    constructor() {
        super("Username or email already in use");
    }
}
