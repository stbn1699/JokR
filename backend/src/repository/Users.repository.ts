import type {Kysely, Transaction} from "kysely";
import type {DB} from "../db/schema.js";
import type {User} from "../models/User.model.js";
import type {NewUser} from "../models/NewUser.model.js";
import type {ExternalProfile, Provider} from "../services/oauth.js";

export type LinkedIdentity = { provider: string; display_name: string | null };

/*
 * Repository d'accès aux utilisateurs
 * - Fournit des méthodes CRUD minimales utilisées par `UsersService`.
 * - Les méthodes retournent des types `User` ou `undefined` si rien n'est trouvé.
 */
export class UsersRepository {
    constructor(private db: Kysely<DB>) {
    }

    // Recherche un utilisateur par email, sans tenir compte des majuscules (retourne undefined si non trouvé)
    async findByEmail(email: string): Promise<User | undefined> {
        return this.db.selectFrom('users').selectAll()
            .where(eb => eb(eb.fn('lower', ['email']), '=', email.toLowerCase()))
            .executeTakeFirst();
    }

    // Recherche un utilisateur par username (retourne undefined si non trouvé)
    async findByUsername(username: string): Promise<User | undefined> {
        return this.db
            .selectFrom('users')
            .selectAll()
            .where('username', '=', username)
            .executeTakeFirst();
    }

    // Recherche un utilisateur par UUID
    async findByUuid(uuid: string): Promise<User | undefined> {
        return this.db
            .selectFrom('users')
            .selectAll()
            .where('id', '=', uuid)
            .executeTakeFirst();
    }

    // Remplace le mot de passe (déjà hashé)
    async updatePassword(id: string, passwordHash: string): Promise<void> {
        await this.db.updateTable('users').set({password: passwordHash}).where('id', '=', id).execute();
    }

    // Supprime le compte (stats, historique et résultats du défi partent avec, en cascade)
    async delete(id: string): Promise<void> {
        await this.db.deleteFrom('users').where('id', '=', id).execute();
    }

    // Joueur lié à ce compte Google / Discord
    async findByIdentity(provider: Provider, providerUserId: string): Promise<User | undefined> {
        return this.db.selectFrom('user_identities')
            .innerJoin('users', 'users.id', 'user_identities.user_id')
            .selectAll('users')
            .where('user_identities.provider', '=', provider)
            .where('user_identities.provider_user_id', '=', providerUserId)
            .executeTakeFirst();
    }

    // Comptes externes liés à un joueur
    async listIdentities(userId: string): Promise<LinkedIdentity[]> {
        return this.db.selectFrom('user_identities')
            .select(['provider', 'display_name'])
            .where('user_id', '=', userId)
            .orderBy('created_at')
            .execute();
    }

    // Lie un compte externe (lève une erreur 23505 s'il est déjà lié, ou si le joueur a déjà ce fournisseur)
    async addIdentity(userId: string, profile: ExternalProfile, db: Kysely<DB> | Transaction<DB> = this.db): Promise<void> {
        await db.insertInto('user_identities').values({
            provider: profile.provider,
            provider_user_id: profile.providerUserId,
            user_id: userId,
            email: profile.email,
            display_name: profile.displayName?.slice(0, 100) ?? null,
        }).execute();
    }

    // Garde l'email et le nom affiché à jour à chaque connexion
    async refreshIdentity(profile: ExternalProfile): Promise<void> {
        await this.db.updateTable('user_identities')
            .set({email: profile.email, display_name: profile.displayName?.slice(0, 100) ?? null})
            .where('provider', '=', profile.provider)
            .where('provider_user_id', '=', profile.providerUserId)
            .execute();
    }

    async removeIdentity(userId: string, provider: Provider): Promise<void> {
        await this.db.deleteFrom('user_identities')
            .where('user_id', '=', userId)
            .where('provider', '=', provider)
            .execute();
    }

    // Crée un joueur sans mot de passe et lui lie son compte externe, en une seule transaction
    async createWithIdentity(username: string, email: string | null, profile: ExternalProfile): Promise<User> {
        return this.db.transaction().execute(async trx => {
            const user = await trx.insertInto('users')
                .values({username, email, password: null, user_xp: 0, user_level: 1})
                .returningAll()
                .executeTakeFirstOrThrow();
            await this.addIdentity(user.id, profile, trx);
            return user;
        });
    }

    // Crée un nouvel utilisateur (s'attend à recevoir le mot de passe déjà hashé)
    async create(user: NewUser): Promise<User> {
        return this.db
            .insertInto("users")
            .values({
                username: user.username,
                email: user.email,
                password: user.password,
                user_xp: 0,
                user_level: 1
            })
            .returningAll()
            .executeTakeFirstOrThrow();
    }
}
