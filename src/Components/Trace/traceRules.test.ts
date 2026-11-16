import {describe, expect, it} from "vitest";
import type {TracePuzzle} from "../../../backend/src/utils/trace.ts";
import {canStep, enterCell, nextValue, traceSolution, wallSet} from "./traceRules.ts";

// 3×3 : 0 1 2 / 3 4 5 / 6 7 8 ; solution 0-1-2-5-4-3-6-7-8 ; murs 1|4 et 4|7
const puzzle: TracePuzzle = {size: 3, numbers: [{cell: 0, value: 1}, {cell: 4, value: 2}, {cell: 8, value: 3}], walls: [[1, 4], [4, 7]]};
const walls = wallSet(puzzle);

describe("tracé : règles côté site", () => {
    it("avance seulement vers une voisine libre, sans mur", () => {
        expect(canStep(puzzle, walls, [0], 1)).toBe(true);
        expect(canStep(puzzle, walls, [0], 4)).toBe(false);
        expect(canStep(puzzle, walls, [0, 1], 4)).toBe(false);
    });

    it("prend les numéros dans l'ordre, et le dernier en tout dernier", () => {
        expect(canStep(puzzle, walls, [0, 3, 6, 7], 8)).toBe(false);
        expect(nextValue(puzzle, [0, 1, 2, 5, 4])).toBe(3);
    });

    it("revenir en arrière efface le chemin jusqu'à la case touchée", () => {
        expect(enterCell(puzzle, walls, [0, 1, 2, 5], 1)).toEqual([0, 1]);
        expect(enterCell(puzzle, walls, [0, 1, 2], 5)).toEqual([0, 1, 2, 5]);
        expect(enterCell(puzzle, walls, [0, 1, 2], 4)).toEqual([0, 1, 2]);
    });

    it("solution seulement quand le chemin est complet et juste", () => {
        expect(traceSolution(puzzle, [0, 1, 2, 5, 4, 3, 6, 7, 8])).toEqual([0, 1, 2, 5, 4, 3, 6, 7, 8]);
        expect(traceSolution(puzzle, [0, 1, 2, 5, 4, 3, 6, 7])).toBeNull();
    });
});
