import {describe, expect, it} from "vitest";
import {creditsFor, creditsTable} from "./credits.js";

describe("creditsFor", () => {
    it("donne 1, 2 ou 3 crédits selon le tiers de la plage", () => {
        // Sudoku : 20 à 55 cases à remplir
        expect(creditsFor(20, 20, 55)).toBe(1);
        expect(creditsFor(31, 20, 55)).toBe(1);
        expect(creditsFor(38, 20, 55)).toBe(2);
        expect(creditsFor(50, 20, 55)).toBe(3);
        expect(creditsFor(55, 20, 55)).toBe(3);
    });

    it("reste entre 1 et 3 hors de la plage", () => {
        expect(creditsFor(5, 20, 55)).toBe(1);
        expect(creditsFor(80, 20, 55)).toBe(3);
        expect(creditsFor(10, 10, 10)).toBe(1);
    });
});

describe("creditsTable", () => {
    it("couvre toute la plage, du plus facile au plus difficile", () => {
        const table = creditsTable(18, 28);
        expect(Object.keys(table)).toHaveLength(11);
        expect(table[18]).toBe(1);
        expect(table[28]).toBe(3);
        const values = Object.values(table);
        expect(values).toEqual([...values].sort());
    });
});
