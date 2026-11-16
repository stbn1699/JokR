import {describe, expect, it} from "vitest";
import {QUEENS_LEVELS, QUEENS_TUTORIAL} from "./queensLevels.js";
import {solveQueens} from "./queens.js";
import {isLevelUnlocked, levelPuzzle} from "./levels.js";
import {GALAXIES_LEVELS, GALAXIES_TUTORIAL} from "./galaxiesLevels.js";
import {solveGalaxies} from "./galaxies.js";

describe("niveaux du Queens", () => {
    it("1000 niveaux, dont 3 leçons de tutoriel, de 4×4 à 12×12", () => {
        expect(QUEENS_LEVELS).toHaveLength(1000);
        expect(QUEENS_TUTORIAL).toBe(3);
        for (const puzzle of QUEENS_LEVELS) {
            expect(puzzle.size).toBeGreaterThanOrEqual(4);
            expect(puzzle.size).toBeLessThanOrEqual(12);
            expect(puzzle.regions).toHaveLength(puzzle.size * puzzle.size);
            expect(new Set(puzzle.regions).size).toBe(puzzle.size);
        }
        // pas deux fois la même grille
        expect(new Set(QUEENS_LEVELS.map(p => p.regions.join(","))).size).toBe(1000);
    });

    it("une seule solution (leçons, et un niveau sur vingt ensuite)", () => {
        const sample = QUEENS_LEVELS.filter((_, i) => i < QUEENS_TUTORIAL || i % 20 === 0);
        for (const puzzle of sample) expect(solveQueens(puzzle, 2).count).toBe(1);
    }, 60_000);

    it("niveaux numérotés à partir de 1, débloqués un par un", () => {
        expect(levelPuzzle("QUEENS", 1)).toBe(QUEENS_LEVELS[0]);
        expect(levelPuzzle("QUEENS", 0)).toBeUndefined();
        expect(levelPuzzle("QUEENS", 1001)).toBeUndefined();
        expect(levelPuzzle("SUDOKU", 1)).toBeUndefined();
        expect(isLevelUnlocked(1, new Set())).toBe(true);
        expect(isLevelUnlocked(3, new Set([1]))).toBe(false);
        expect(isLevelUnlocked(3, new Set([1, 2]))).toBe(true);
    });
});

describe("niveaux des Galaxies", () => {
    it("3 leçons de tutoriel, chacune à solution unique", () => {
        expect(GALAXIES_TUTORIAL).toBe(3);
        expect(GALAXIES_LEVELS.length).toBeGreaterThanOrEqual(GALAXIES_TUTORIAL);
        for (const puzzle of GALAXIES_LEVELS) {
            const {count, aborted} = solveGalaxies(puzzle, 2);
            expect(aborted).toBe(false);
            expect(count).toBe(1);
        }
        expect(levelPuzzle("GALAXIES", 1)).toBe(GALAXIES_LEVELS[0]);
    });
});
