import {describe, expect, it} from "vitest";
import {isFiltered, NO_FILTER, parseStatsFilter} from "./statsFilter.js";

describe("parseStatsFilter", () => {
    it("sans paramètre : aucun filtre", () => {
        expect(parseStatsFilter({})).toEqual(NO_FILTER);
        expect(isFiltered(NO_FILTER)).toBe(false);
    });

    it("lit la période et le jeu", () => {
        const f = parseStatsFilter({de: "2026-11-01T08:00:00.000Z", a: "2026-11-02T20:30:00.000Z", jeu: "SUDOKU"});
        expect(f).toEqual({from: new Date("2026-11-01T08:00:00.000Z"), to: new Date("2026-11-02T20:30:00.000Z"), game: "SUDOKU"});
        expect(isFiltered(f as never)).toBe(true);
        expect(parseStatsFilter({jeu: "plinko"})).toEqual({from: null, to: null, game: "plinko"});
    });

    it("refuse les valeurs invalides", () => {
        expect(parseStatsFilter({de: "hier"})).toBe("Date invalide");
        expect(parseStatsFilter({de: "2026-11-02T00:00:00Z", a: "2026-11-01T00:00:00Z"})).toBe("Le début doit être avant la fin");
        expect(parseStatsFilter({jeu: "'; drop table users"})).toBe("Jeu invalide");
        expect(parseStatsFilter({jeu: ["SUDOKU", "BINERO"]})).toBe("Jeu invalide");
    });
});
