import {describe, expect, it} from "vitest";
import {fileURLToPath} from "node:url";
import {compareVersions, flywayChecksum, loadMigrations, parseMigrationName} from "./migrate.js";

const MIGRATIONS_DIR = fileURLToPath(new URL("../../../database/migrations", import.meta.url));

describe("parseMigrationName", () => {
    it("lit la version et la description comme Flyway", () => {
        expect(parseMigrationName("V1_0_10__create-tables_daily_challenge.sql"))
            .toEqual({version: "1.0.10", description: "create-tables daily challenge"});
    });

    it("ignore les fichiers qui ne sont pas des migrations", () => {
        expect(parseMigrationName("README.md")).toBeNull();
        expect(parseMigrationName("R__vue.sql")).toBeNull();
    });
});

describe("flywayChecksum", () => {
    it("ne dépend pas des fins de ligne", () => {
        expect(flywayChecksum("select 1;\r\nselect 2;\r\n")).toBe(flywayChecksum("select 1;\nselect 2;"));
    });
});

describe("compareVersions", () => {
    it("compare numériquement chaque segment", () => {
        expect(compareVersions("1.0.10", "1.0.9")).toBeGreaterThan(0);
        expect(compareVersions("1.0", "1.0.0")).toBe(0);
    });
});

describe("loadMigrations", () => {
    const migrations = loadMigrations(MIGRATIONS_DIR);

    it("trie les migrations par version", () => {
        const versions = migrations.map(m => m.version);
        expect(versions.indexOf("1.0.10")).toBe(versions.indexOf("1.0.9") + 1);
        expect(versions[0]).toBe("1.0.1");
    });

    it("calcule les mêmes checksums que Flyway", () => {
        // Valeurs relevées dans flyway_schema_history d'une base migrée par Flyway
        const byVersion = Object.fromEntries(migrations.map(m => [m.version, m]));
        expect(byVersion["1.0.1"]).toMatchObject({script: "V1.0/V1_0_1__create-table_games.sql", checksum: 514207177});
        expect(byVersion["1.0.2"]?.checksum).toBe(-577787516);
        expect(byVersion["1.0.10"]?.checksum).toBe(214919359);
    });
});
