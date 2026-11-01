import {readdirSync, readFileSync} from "node:fs";
import {join, relative, sep} from "node:path";
import {crc32} from "node:zlib";
import type {Pool} from "pg";

/*
 * Applique les migrations SQL de database/migrations au démarrage (image Docker).
 * Compatible Flyway : même table d'historique (flyway_schema_history), même checksum,
 * donc une base migrée par Flyway peut l'être ensuite par ce code, et inversement.
 * Comme Flyway : une migration modifiée après coup, un échec passé ou une migration
 * plus ancienne que la dernière appliquée bloquent le démarrage.
 */

export type Migration = {version: string; description: string; script: string; sql: string; checksum: number};

const FILE_PATTERN = /^V(\d+(?:[._]\d+)*)__(.+)\.sql$/;
const HISTORY = "flyway_schema_history";
// Verrou Postgres pour que deux instances ne migrent pas en même temps
const LOCK_ID = 727_100_001;

/** "V1_0_10__create-tables_daily.sql" → version "1.0.10", description "create-tables daily" */
export function parseMigrationName(fileName: string): {version: string; description: string} | null {
    const match = FILE_PATTERN.exec(fileName);
    if (!match) return null;
    return {version: match[1]!.replaceAll("_", "."), description: match[2]!.replaceAll("_", " ")};
}

/** Checksum Flyway : CRC32 de chaque ligne sans son retour à la ligne, en entier signé */
export function flywayChecksum(sql: string): number {
    const lines = (sql.startsWith("\u{FEFF}") ? sql.slice(1) : sql).split(/\r\n|\r|\n/);
    if (lines.at(-1) === "") lines.pop();
    let crc = 0;
    for (const line of lines) crc = crc32(Buffer.from(line, "utf8"), crc);
    return crc | 0;
}

export function compareVersions(a: string, b: string): number {
    const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

export function loadMigrations(dir: string): Migration[] {
    const migrations: Migration[] = [];
    for (const entry of readdirSync(dir, {recursive: true, withFileTypes: true})) {
        if (!entry.isFile()) continue;
        const parsed = parseMigrationName(entry.name);
        if (!parsed) continue;
        const path = join(entry.parentPath, entry.name);
        const sql = readFileSync(path, "utf8");
        migrations.push({...parsed, script: relative(dir, path).split(sep).join("/"), sql, checksum: flywayChecksum(sql)});
    }
    return migrations.sort((a, b) => compareVersions(a.version, b.version));
}

/** Attend que la base accepte les connexions (conteneur Postgres encore en démarrage) */
async function connectWithRetry(pool: Pool, log: (msg: string) => void, timeoutMs = 60_000) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        try {
            return await pool.connect();
        } catch (err) {
            if (Date.now() > deadline) throw err;
            log(`Base de données pas encore prête (${(err as Error).message}), nouvel essai…`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

export async function migrate(pool: Pool, dir: string, log: (msg: string) => void = console.log): Promise<void> {
    const migrations = loadMigrations(dir);
    const client = await connectWithRetry(pool, log);
    try {
        await client.query("select pg_advisory_lock($1)", [LOCK_ID]);
        await client.query(`
            create table if not exists ${HISTORY} (
                installed_rank int not null primary key,
                version varchar(50),
                description varchar(200) not null,
                type varchar(20) not null,
                script varchar(1000) not null,
                checksum int,
                installed_by varchar(100) not null,
                installed_on timestamp not null default now(),
                execution_time int not null,
                success boolean not null
            )`);
        const {rows: applied} = await client.query<{installed_rank: number; version: string | null; checksum: number | null; success: boolean}>(
            `select installed_rank, version, checksum, success from ${HISTORY} order by installed_rank`);

        const failed = applied.find(row => !row.success);
        if (failed) throw new Error(`La migration ${failed.version} a échoué précédemment : corrige la base puis supprime sa ligne de ${HISTORY}`);

        const appliedByVersion = new Map(applied.filter(row => row.version).map(row => [row.version!, row]));
        for (const m of migrations) {
            const row = appliedByVersion.get(m.version);
            if (row && row.checksum !== m.checksum) {
                throw new Error(`La migration ${m.script} a été modifiée après avoir été appliquée`);
            }
        }

        const latest = [...appliedByVersion.keys()].sort(compareVersions).at(-1);
        const pending = migrations.filter(m => !appliedByVersion.has(m.version));
        const outOfOrder = latest ? pending.find(m => compareVersions(m.version, latest) < 0) : undefined;
        if (outOfOrder) throw new Error(`La migration ${outOfOrder.script} est plus ancienne que la dernière appliquée (${latest})`);

        let rank = applied.at(-1)?.installed_rank ?? 0;
        for (const m of pending) {
            const start = Date.now();
            await client.query("begin");
            try {
                await client.query(m.sql);
                await client.query(
                    `insert into ${HISTORY} (installed_rank, version, description, type, script, checksum, installed_by, execution_time, success)
                     values ($1, $2, $3, 'SQL', $4, $5, current_user, $6, true)`,
                    [++rank, m.version, m.description, m.script, m.checksum, Date.now() - start]);
                await client.query("commit");
            } catch (err) {
                await client.query("rollback");
                throw new Error(`Échec de la migration ${m.script} : ${(err as Error).message}`, {cause: err});
            }
            log(`Migration appliquée : ${m.script}`);
        }
        log(pending.length ? `${pending.length} migration(s) appliquée(s)` : "Base de données à jour");
    } finally {
        await client.query("select pg_advisory_unlock($1)", [LOCK_ID]).catch(() => undefined);
        client.release();
    }
}
