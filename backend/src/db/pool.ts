import { Pool } from "pg";

/*
 * Configuration du pool Postgres. Les paramètres sont lus depuis les variables d'environnement.
 * Veillez à définir PGHOST, PGPORT, PGUSER, PGPASSWORD et PGDATABASE en dev/prod.
 */
export const pool = new Pool({
	host: process.env.PGHOST,
	port: Number(process.env.PGPORT ?? 5432),
	user: process.env.PGUSER,
	password: process.env.PGPASSWORD,
	database: process.env.PGDATABASE
});
