import {describe, expect, it} from "vitest";
import {generateMotsACaser, isMotsACaserSolution, MOTS_A_CASER_SIZES, motsACaserGrids, transposeGrid, wordSlots} from "./motsACaser.js";

function seeded(seed: number) {
    let state = seed;
    return (max: number) => {
        state = (state * 48271) % 2147483647;
        return state % max;
    };
}

describe("Mots à caser", () => {
    it("n'a que des grilles denses, aux mots tous différents", () => {
        for (const {size} of MOTS_A_CASER_SIZES) {
            const grids = motsACaserGrids(size);
            expect(grids.length).toBeGreaterThan(0);
            for (const grid of grids) {
                expect(grid).toHaveLength(size * size);
                expect(grid.split("#").length - 1).toBeLessThanOrEqual(Math.ceil(size * size * 0.18));
                const words = wordSlots(grid, size).map(slot => slot.map(c => grid[c]).join(""));
                expect(new Set(words).size).toBe(words.length);
                const inWord = new Set(wordSlots(grid, size).flat());
                Array.from(grid).forEach((letter, cell) => {
                    if (letter !== "#") expect(inWord.has(cell)).toBe(true);
                });
            }
        }
    });

    it("démarre sans aucun mot placé par défaut", () => {
        const random = seeded(5);
        for (const limits of MOTS_A_CASER_SIZES) {
            expect(limits.min).toBe(0);
            expect(limits.default).toBe(0);
            const puzzle = generateMotsACaser(limits.size, 0, random);
            expect(puzzle.cells).toMatch(/^[.#]+$/);
            expect(isMotsACaserSolution(puzzle, puzzle.solution)).toBe(true);
        }
    });

    it("place le nombre de mots demandé", () => {
        const random = seeded(23);
        const puzzle = generateMotsACaser(15, 3, random);
        const complete = wordSlots(puzzle.cells, 15).filter(slot => slot.every(c => puzzle.cells[c] !== "."));
        expect(complete.length).toBeGreaterThanOrEqual(3);
    });

    it("échange lignes et colonnes", () => {
        expect(transposeGrid("ABCDEFGHI", 3)).toBe("ADGBEHCFI");
    });

    it("trouve les emplacements en ligne et en colonne", () => {
        expect(wordSlots("AB#C#DEFG", 3)).toEqual([[0, 1], [6, 7, 8], [0, 3, 6], [5, 8]]);
    });

    it("refuse une grille fausse", () => {
        const puzzle = {size: 3, cells: "C.T#.#...", words: ["CAT", "ARE", "ERA"], solution: "CAT#R#ERA"};
        expect(isMotsACaserSolution(puzzle, "CATXR#ERA")).toBe(false);
        expect(isMotsACaserSolution(puzzle, "COT#R#ERA")).toBe(false);
        expect(isMotsACaserSolution(puzzle, "CAT#R")).toBe(false);
        expect(isMotsACaserSolution(puzzle, 12)).toBe(false);
    });
});
