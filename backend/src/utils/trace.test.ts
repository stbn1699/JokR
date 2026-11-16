import {describe, expect, it} from "vitest";
import {generateTrace, isTraceSolution, randomHamiltonianPath, solveTrace, type TracePuzzle, traceNeighbours} from "./trace.js";

// générateur reproductible (mulberry32)
function rng(seed: number) {
    let a = seed;
    return (n: number) => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return Math.floor(((t ^ (t >>> 14)) >>> 0) / 4294967296 * n);
    };
}

// 3×3 : 0 1 2 / 3 4 5 / 6 7 8, chemin en serpentin 0-1-2-5-4-3-6-7-8
const small: TracePuzzle = {size: 3, numbers: [{cell: 0, value: 1}, {cell: 4, value: 2}, {cell: 8, value: 3}], walls: [[1, 4], [4, 7]]};

describe("tracé : vérification", () => {
    it("accepte le bon chemin", () => {
        expect(isTraceSolution(small, [0, 1, 2, 5, 4, 3, 6, 7, 8])).toBe(true);
    });

    it("refuse un chemin qui saute une case, traverse un mur ou rate l'ordre", () => {
        expect(isTraceSolution(small, [0, 1, 2, 5, 4, 3, 6, 7])).toBe(false);
        expect(isTraceSolution(small, [0, 3, 4, 1, 2, 5, 8, 7, 6])).toBe(false);
        expect(isTraceSolution(small, [0, 1, 2, 5, 8, 7, 6, 3, 4])).toBe(false);
        expect(isTraceSolution(small, "0,1,2")).toBe(false);
    });

    it("le solveur trouve la seule solution", () => {
        const solved = solveTrace(small, 2);
        expect(solved.complete).toBe(true);
        expect(solved.solutions).toEqual([[0, 1, 2, 5, 4, 3, 6, 7, 8]]);
    });
});

describe("tracé : génération", () => {
    it("chemin au hasard : toutes les cases, de voisine en voisine", () => {
        const random = rng(4);
        for (const size of [4, 6, 8]) {
            const path = randomHamiltonianPath(size, random);
            expect(new Set(path).size).toBe(size * size);
            for (let i = 1; i < path.length; i++) expect(traceNeighbours(size, path[i - 1]!)).toContain(path[i]);
        }
    });

    it("grilles de 5×5 à 8×8 avec une seule solution, qui est celle du générateur", () => {
        const random = rng(11);
        for (const size of [5, 6, 7, 8]) {
            for (let k = 0; k < 4; k++) {
                const {puzzle, solution} = generateTrace(size, 0, random);
                expect(isTraceSolution(puzzle, solution)).toBe(true);
                const solved = solveTrace(puzzle, 2, 5_000_000);
                expect(solved.complete).toBe(true);
                expect(solved.count).toBe(1);
            }
        }
    }, 60_000);

    it("l'aide ajoute des numéros", () => {
        const a = generateTrace(6, 0, rng(5)).puzzle.numbers.length;
        const b = generateTrace(6, 4, rng(5)).puzzle.numbers.length;
        expect(b).toBe(a + 4);
    });
});
