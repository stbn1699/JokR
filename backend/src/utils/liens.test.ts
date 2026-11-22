import {describe, expect, it} from "vitest";
import {generateLiens, isLiensSolution, LIENS_SIZES} from "./liens.js";

function seeded(seed: number) {
    let state = seed;
    return (max: number) => {
        state = (state * 48271) % 2147483647;
        return state % max;
    };
}

describe("Liens", () => {
    it("génère chaque réglage, avec une solution valable", () => {
        const random = seeded(29);
        for (const {size, min, max} of LIENS_SIZES) {
            for (let count = min; count <= max; count++) {
                const puzzle = generateLiens(size, count, random);
                expect(puzzle.pairs).toHaveLength(count);
                expect(new Set(puzzle.pairs.flat()).size).toBe(count * 2);
                expect(isLiensSolution(puzzle, puzzle.solution)).toBe(true);
                // toutes les cases sont couvertes, une seule fois
                expect(puzzle.solution.flat().length).toBe(size * size);
                expect(new Set(puzzle.solution.flat()).size).toBe(size * size);
            }
        }
    }, 60_000);

    it("accepte une ligne dans les deux sens", () => {
        const puzzle = {size: 3, pairs: [[0, 2], [3, 8]] as [number, number][], solution: []};
        expect(isLiensSolution(puzzle, [[2, 1, 0], [8, 5, 4, 7, 6, 3]])).toBe(true);
    });

    it("refuse une grille qui n'est pas entièrement remplie", () => {
        const puzzle = {size: 3, pairs: [[0, 2], [3, 8]] as [number, number][], solution: []};
        expect(isLiensSolution(puzzle, [[0, 1, 2], [3, 4, 5, 8]])).toBe(false);
    });

    it("refuse les lignes fausses", () => {
        const puzzle = {size: 3, pairs: [[0, 2], [3, 8]] as [number, number][], solution: []};
        // saut de case
        expect(isLiensSolution(puzzle, [[0, 2], [3, 6, 7, 4, 5, 8]])).toBe(false);
        // deux lignes sur la même case
        expect(isLiensSolution(puzzle, [[0, 1, 2], [3, 4, 1, 2, 5, 8]])).toBe(false);
        // ne finit pas sur sa paire
        expect(isLiensSolution(puzzle, [[0, 1], [3, 6, 7, 4, 5, 8]])).toBe(false);
        // passe sur la lettre d'une autre paire
        expect(isLiensSolution({...puzzle, pairs: [[0, 2], [1, 7]]}, [[0, 1, 2], [1, 4, 7]])).toBe(false);
        expect(isLiensSolution(puzzle, [[0, 1, 2]])).toBe(false);
        expect(isLiensSolution(puzzle, "0")).toBe(false);
    });
});
