import type {Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import type {User} from "../models/User.model.js";
import type {NewUser} from "../models/NewUser.model.js";

/*
 * Repository d'accès aux utilisateurs
 * - Fournit des méthodes CRUD minimales utilisées par `UsersService`.
 * - Les méthodes retournent des types `User` ou `undefined` si rien n'est trouvé.
 */
export class UsersRepository {
    constructor(private db: Kysely<DB>) {
    }

    // Recherche un utilisateur par email (retourne undefined si non trouvé)
    async findByEmail(email: string): Promise<User | undefined> {
        return this.db.selectFrom('users').selectAll().where('email', '=', email).executeTakeFirst();
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
