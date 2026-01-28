import type {Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import type {User} from "../models/User.model.js";
import type {NewUser} from "../models/NewUser.model.js";

export class UsersRepository {
    constructor(private db: Kysely<DB>) {
    }

    async findByEmail(email: string): Promise<User | undefined> {
        return this.db.selectFrom('users').selectAll().where('email', '=', email).executeTakeFirst();
    }

    async findByUsername(username: string): Promise<User | undefined> {
        return this.db
            .selectFrom('users')
            .selectAll()
            .where('username', '=', username)
            .executeTakeFirst();
    }

    async findByUuid(uuid: string): Promise<User | undefined> {
        return this.db
            .selectFrom('users')
            .selectAll()
            .where('id', '=', uuid)
            .executeTakeFirst();
    }

    async create(user: NewUser): Promise<User> {
        return this.db
            .insertInto("users")
            .values({
                username: user.username,
                email: user.email,
                password: user.password,
            })
            .returningAll()
            .executeTakeFirstOrThrow();
    }
}
