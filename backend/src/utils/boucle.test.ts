import {describe, expect, it} from "vitest";
import {BOUCLE_SIZES, boucleCredits, generateBoucle, isBoucleSolution} from "./boucle.js";

function seeded(seed: number) {
    let state = seed;
    return (max: number) => {
        state = (state * 48271) % 2147483647;
        return state % max;
    };
}

describe("Boucle", () => {
    it("génère chaque réglage, avec une boucle valable et le bon nombre de murs", () => {
        const random = seeded(31);
        for (const {size, min, max} of BOUCLE_SIZES) {
            for (const count of [min, Math.floor((min + max) / 2), max]) {
                const puzzle = generateBoucle(size, count, random);
                expect(puzzle.walls).toHaveLength(count);
                expect(new Set(puzzle.walls.map(([a, b]) => `${a}-${b}`)).size).toBe(count);
                expect(puzzle.solution).toHaveLength(size * size);
                expect(isBoucleSolution(puzzle, puzzle.solution)).toBe(true);
            }
        }
    });

    it("accepte la boucle dans les deux sens et depuis n'importe quelle case", () => {
        const puzzle = {size: 2, walls: [], solution: []};
        expect(isBoucleSolution(puzzle, [0, 1, 3, 2])).toBe(true);
        expect(isBoucleSolution(puzzle, [3, 1, 0, 2])).toBe(true);
    });

    it("refuse une boucle qui traverse un mur", () => {
        const puzzle = {size: 2, walls: [[0, 1]] as [number, number][], solution: []};
        expect(isBoucleSolution(puzzle, [0, 1, 3, 2])).toBe(false);
    });

    it("refuse les tracés faux", () => {
        const puzzle = {size: 2, walls: [], solution: []};
        // diagonale
        expect(isBoucleSolution(puzzle, [0, 3, 1, 2])).toBe(false);
        // case répétée
        expect(isBoucleSolution(puzzle, [0, 1, 0, 2])).toBe(false);
        // incomplet
        expect(isBoucleSolution(puzzle, [0, 1, 3])).toBe(false);
        expect(isBoucleSolution(puzzle, "0")).toBe(false);
    });

    it("donne plus de crédits avec moins de murs", () => {
        const {size, min, max} = BOUCLE_SIZES[1]!;
        expect(boucleCredits(size, min)).toBe(3);
        expect(boucleCredits(size, max)).toBe(1);
    });
});
