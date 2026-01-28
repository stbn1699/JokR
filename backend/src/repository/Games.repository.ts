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
}
