import {describe, expect, it} from "vitest";
import {analyzeRects, rectBetween, rectCells, rectsOverlap} from "./shikakuRules.ts";
import type {ShikakuPuzzle} from "../../Models/shikaku.model.ts";

// 4×2 : un 4 en haut à gauche, un 4 en bas à gauche
const puzzle: ShikakuPuzzle = {width: 4, height: 2, clues: [{cell: 0, area: 4}, {cell: 4, area: 4}], rects: []};

describe("shikakuRules", () => {
    it("construit un rectangle entre deux cases, dans n'importe quel sens", () => {
        expect(rectBetween(6, 1, 4)).toEqual([0, 1, 2, 2]);
        expect(rectCells([0, 1, 2, 2], 4)).toEqual([1, 2, 5, 6]);
    });

    it("détecte les rectangles qui se chevauchent", () => {
        expect(rectsOverlap([0, 0, 1, 4], [0, 3, 2, 1])).toBe(true);
        expect(rectsOverlap([0, 0, 1, 4], [1, 0, 1, 4])).toBe(false);
    });

    it("juge les rectangles et trouve la solution quand tout est couvert", () => {
        const partial = analyzeRects(puzzle, [[0, 0, 1, 4]]);
        expect(partial.statuses).toEqual(["valid"]);
        expect(partial.solution).toBeNull();

        const done = analyzeRects(puzzle, [[0, 0, 1, 4], [1, 0, 1, 4]]);
        expect(done.solution).toEqual([0, 0, 0, 0, 1, 1, 1, 1]);

        // deux nombres dans le même rectangle, mauvaise aire
        expect(analyzeRects(puzzle, [[0, 0, 2, 2]]).statuses).toEqual(["error"]);
        expect(analyzeRects(puzzle, [[0, 0, 1, 3]]).statuses).toEqual(["error"]);
    });
});
