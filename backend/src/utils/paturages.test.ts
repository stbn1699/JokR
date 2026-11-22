import {describe, expect, it} from "vitest";
import {generatePaturages, isPaturagesSolution, isUniquePaturages, PATURAGES_SIZES, type PaturagesPuzzle} from "./paturages.js";

function seeded(seed: number) {
    let state = seed;
    return (max: number) => {
        state = (state * 48271) % 2147483647;
        return state % max;
    };
}

// Pré 3×3 : un carré 2×2 en haut à gauche et cinq 1×1
const small: PaturagesPuzzle = {
    size: 3,
    cows: [0, 2, 5, 6, 7, 8],
    given: [],
    solution: [],
};
const answer = [
    {row: 0, col: 0, side: 2},
    {row: 0, col: 2, side: 1},
    {row: 1, col: 2, side: 1},
    {row: 2, col: 0, side: 1},
    {row: 2, col: 1, side: 1},
    {row: 2, col: 2, side: 1},
];

describe("Pâturages", () => {
    it("génère chaque taille avec une solution unique, en carrés variés", () => {
        const random = seeded(41);
        for (const {size, max} of PATURAGES_SIZES) {
            for (const given of [0, max]) {
                const puzzle = generatePaturages(size, given, random);
                expect(puzzle.cows).toHaveLength(puzzle.solution.length);
                expect(isPaturagesSolution({...puzzle, given: []}, puzzle.solution)).toBe(true);
                expect(isPaturagesSolution(puzzle, puzzle.solution)).toBe(true);
                expect(isUniquePaturages(size, puzzle.cows)).toBe(true);
                expect(puzzle.given).toHaveLength(given);
                expect(new Set(puzzle.solution.map(s => s.side)).size).toBeGreaterThan(1);
            }
        }
    }, 60_000);

    it("accepte un découpage juste", () => {
        expect(isPaturagesSolution(small, answer)).toBe(true);
    });

    it("refuse les découpages faux", () => {
        // deux vaches dans un carré (et donc un carré sans vache)
        expect(isPaturagesSolution({...small, cows: [0, 1, 5, 6, 7, 8]}, answer)).toBe(false);
        // chevauchement, sortie du pré, trou, format faux
        expect(isPaturagesSolution(small, [...answer.slice(0, 5), {row: 1, col: 1, side: 1}])).toBe(false);
        expect(isPaturagesSolution(small, [...answer.slice(0, 5), {row: 2, col: 2, side: 2}])).toBe(false);
        expect(isPaturagesSolution(small, answer.slice(0, 5))).toBe(false);
        expect(isPaturagesSolution(small, "0")).toBe(false);
    });

    it("exige les carrés donnés", () => {
        const puzzle = {...small, given: [{row: 0, col: 0, side: 1}]};
        expect(isPaturagesSolution(puzzle, answer)).toBe(false);
    });
});
