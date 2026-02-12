import { Kysely, PostgresDialect } from "kysely";
import type { Pool } from "pg";
import type { DB } from "./schema.js";

/*
 * Crée et retourne une instance Kysely connectée au pool Postgres fourni.
 * Utilisé par les routers pour construire des repositories.
 */
export function createDb(pool: Pool) {
	return new Kysely<DB>({
		dialect: new PostgresDialect({ pool }),
	});
}
