import {describe, expect, it} from "vitest";
import {bineroConflicts} from "./bineroRules.ts";
import type {BineroCell} from "../../Models/bineroSettings.model.ts";

const _ = null;
const grid = (rows: BineroCell[][]) => rows.flat();

describe("bineroConflicts", () => {
    it("ne signale rien sur une grille vide ou correcte", () => {
        expect(bineroConflicts(Array(16).fill(null), 4).size).toBe(0);
        expect(bineroConflicts(grid([
            [0, 1, 1, 0],
            [1, 0, 0, 1],
            [0, 0, 1, 1],
            [1, 1, 0, 0],
        ]), 4).size).toBe(0);
    });

    it("signale trois chiffres identiques côte à côte", () => {
        const c = bineroConflicts(grid([
            [1, 1, 1, _],
            [_, _, _, _],
            [_, _, _, _],
            [_, _, _, _],
        ]), 4);
        expect([...c].sort()).toEqual([0, 1, 2]);
    });

    it("signale une colonne avec trop de 0", () => {
        const c = bineroConflicts(grid([
            [0, _, _, _],
            [1, _, _, _],
            [0, _, _, _],
            [0, _, _, _],
        ]), 4);
        expect([...c].sort((a, b) => a - b)).toEqual([0, 8, 12]);
    });

    it("signale deux lignes complètes identiques", () => {
        const c = bineroConflicts(grid([
            [0, 1, 0, 1],
            [0, 1, 0, 1],
            [_, _, _, _],
            [_, _, _, _],
        ]), 4);
        expect(c.size).toBe(8);
    });
});
