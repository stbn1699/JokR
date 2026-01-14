import { Kysely, PostgresDialect } from "kysely";
import type { Pool } from "pg";
import type { DB } from "./schema.js";

export function createDb(pool: Pool) {
	return new Kysely<DB>({
		dialect: new PostgresDialect({ pool }),
	});
}
