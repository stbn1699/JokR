import {describe, expect, it} from "vitest";
import {generateQueens, growRegions, isQueensSolution, type QueensPuzzle, randomQueens, solveQueens} from "./queens.js";

// 4×4, une zone par ligne : les dames (colonnes 1, 3, 0, 2) sont la seule solution sans contact
//   0 0 0 0
//   1 1 1 1
//   2 2 2 2
//   3 3 3 3
const rows: QueensPuzzle = {size: 4, regions: [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3], queens: []};

describe("queens", () => {
    it("place N dames sans qu'elles se touchent, et des zones autour", () => {
        for (let k = 0; k < 20; k++) {
            const cols = randomQueens(8)!;
            expect(new Set(cols).size).toBe(8);
            cols.forEach((c, r) => r > 0 && expect(Math.abs(c - cols[r - 1]!)).toBeGreaterThan(1));
            const regions = growRegions(8, cols);
            expect(new Set(regions).size).toBe(8);
            expect(regions.every(r => r >= 0)).toBe(true);
        }
    });

    it("compte les solutions d'une grille", () => {
        // Sans contact, 4×4 a deux placements : colonnes 1,3,0,2 et 2,0,3,1
        expect(solveQueens(rows).count).toBe(2);
        // Une dame donnée en case 1 (ligne 0, colonne 1) : il n'en reste qu'un
        const {count, solution} = solveQueens({...rows, queens: [1]});
        expect(count).toBe(1);
        expect(solution).toEqual([1, 3, 0, 2]);
    });

    it("génère des grilles à solution unique, avec les dames d'aide demandées", () => {
        for (const size of [6, 8]) {
            const {puzzle, solution} = generateQueens(size, 1);
            expect(puzzle.queens).toHaveLength(1);
            expect(solveQueens({...puzzle, queens: []}).count).toBe(1);
            expect(isQueensSolution(puzzle, solution)).toBe(true);
        }
    });

    it("vérifie une solution envoyée", () => {
        expect(isQueensSolution(rows, [1, 7, 8, 14])).toBe(true);
        // deux dames qui se touchent en diagonale
        expect(isQueensSolution(rows, [0, 5, 11, 14])).toBe(false);
        // deux dames dans la même colonne
        expect(isQueensSolution(rows, [1, 7, 9, 14])).toBe(false);
        // dame donnée absente, mauvais format
        expect(isQueensSolution({...rows, queens: [2]}, [1, 7, 8, 14])).toBe(false);
        expect(isQueensSolution(rows, [1, 7, 8])).toBe(false);
    });
});
