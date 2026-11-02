import {describe, expect, it} from "vitest";
import {generateShikaku, isShikakuSolution, randomRects, rectCells, type ShikakuPuzzle, solveShikaku} from "./shikaku.js";

// 4×2 : un 4 en haut à gauche, un 4 en bas à gauche → deux bandes horizontales de 4 cases
// (deux carrés 2×2 mettraient les deux nombres dans le même carré)
//   4 . . .
//   4 . . .
const small: ShikakuPuzzle = {width: 4, height: 2, clues: [{cell: 0, area: 4}, {cell: 4, area: 4}], rects: []};

describe("shikaku", () => {
    it("découpe la grille en rectangles qui la couvrent exactement", () => {
        for (let k = 0; k < 20; k++) {
            const rects = randomRects(7, 7, 10);
            const covered = rects.flatMap(r => rectCells(r, 7)).sort((a, b) => a - b);
            expect(covered).toEqual(Array.from({length: 49}, (_, i) => i));
        }
    });

    it("trouve la solution unique d'une petite grille", () => {
        const {count, solution} = solveShikaku(small);
        expect(count).toBe(1);
        expect(solution).toEqual([0, 0, 0, 0, 1, 1, 1, 1]);
    });

    it("génère des grilles à solution unique, avec les rectangles d'aide demandés", () => {
        for (const size of [5, 7, 10]) {
            const {puzzle, solution} = generateShikaku(size, size, 2, 10);
            expect(puzzle.rects).toHaveLength(2);
            expect(solveShikaku({...puzzle, rects: []}).count).toBe(1);
            const regions = Array<number>(size * size).fill(-1);
            solution.forEach((rect, i) => rectCells(rect, size).forEach(k => (regions[k] = i)));
            expect(isShikakuSolution(puzzle, regions)).toBe(true);
        }
    });

    it("vérifie une solution envoyée", () => {
        expect(isShikakuSolution(small, [0, 0, 0, 0, 1, 1, 1, 1])).toBe(true);
        // deux carrés 2×2 : le carré de gauche contiendrait les deux nombres
        expect(isShikakuSolution(small, [0, 0, 1, 1, 0, 0, 1, 1])).toBe(false);
        // pas un rectangle (forme en L)
        expect(isShikakuSolution(small, [0, 0, 0, 1, 0, 1, 1, 1])).toBe(false);
        // nombre hors de son rectangle
        expect(isShikakuSolution(small, [1, 1, 1, 1, 0, 0, 0, 0])).toBe(false);
        // rectangle donné non respecté (2×2 imposé à gauche)
        expect(isShikakuSolution({...small, rects: [[0, 0, 2, 2]]}, [0, 0, 0, 0, 1, 1, 1, 1])).toBe(false);
        // mauvais format
        expect(isShikakuSolution(small, [0, 0, 0])).toBe(false);
    });
});
