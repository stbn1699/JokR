import type { Kysely } from "kysely";
import type { DB } from "../../db/schema.js";
import type { Game } from "./game.model.js";

export class GamesRepository {
	constructor(private db: Kysely<DB>) {
	}

	async list(): Promise<Game[]> {
		return this.db
			.selectFrom("games")
			.select(["id", "code", "designation"])
			.orderBy("designation", "asc")
			.execute();
	}
}
