import {describe, expect, it} from "vitest";
import {QUEENS_LEVELS, QUEENS_TUTORIAL} from "./queensLevels.js";
import {solveQueens} from "./queens.js";
import {isLevelUnlocked, levelPuzzle} from "./levels.js";

describe("niveaux du Queens", () => {
    it("10 niveaux, dont 4 de tutoriel, du plus petit au plus grand", () => {
        expect(QUEENS_LEVELS).toHaveLength(10);
        expect(QUEENS_TUTORIAL).toBe(4);
        const sizes = QUEENS_LEVELS.map(l => l.size);
        expect([...sizes].sort((a, b) => a - b)).toEqual(sizes);
    });

    it("chaque niveau a une seule solution", () => {
        for (const puzzle of QUEENS_LEVELS) {
            expect(puzzle.regions).toHaveLength(puzzle.size * puzzle.size);
            expect(new Set(puzzle.regions).size).toBe(puzzle.size);
            expect(solveQueens(puzzle, 2).count).toBe(1);
        }
    });

    it("niveaux numérotés à partir de 1, débloqués un par un", () => {
        expect(levelPuzzle("QUEENS", 1)).toBe(QUEENS_LEVELS[0]);
        expect(levelPuzzle("QUEENS", 0)).toBeUndefined();
        expect(levelPuzzle("QUEENS", 11)).toBeUndefined();
        expect(levelPuzzle("SUDOKU", 1)).toBeUndefined();
        expect(isLevelUnlocked(1, new Set())).toBe(true);
        expect(isLevelUnlocked(3, new Set([1]))).toBe(false);
        expect(isLevelUnlocked(3, new Set([1, 2]))).toBe(true);
    });
});
