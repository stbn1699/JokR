import type {Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import type {Game} from "../models/Game.model.js";

export class GamesRepository {
    constructor(private readonly db: Kysely<DB>) {}

    async list(): Promise<Game[]> {
        return this.db
            .selectFrom("games")
            .selectAll()
            .orderBy("designation", "asc")
            .execute();
    }

    async getBaseXp(gameCode: string): Promise<number | undefined> {
        const row = await this.db
            .selectFrom("games")
            .select("base_xp")
            .where("code", "=", gameCode)
            .executeTakeFirst();

        return row?.base_xp;
    }
}
