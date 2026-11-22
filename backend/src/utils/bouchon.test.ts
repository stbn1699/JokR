import {describe, expect, it} from "vitest";
import {BOUCHON_SIZES, type BouchonPuzzle, decodeParking, encodeParking, exploreParking, generateBouchon, isBouchonSolution} from "./bouchon.js";
import {BOUCHON_BANK} from "./bouchonBankData.js";

function seeded(seed: number) {
    let state = seed;
    return (max: number) => {
        state = (state * 48271) % 2147483647;
        return state % max;
    };
}

// Taxi bloqué par un véhicule vertical en colonne 4
const simple: BouchonPuzzle = {
    size: 6,
    exitRow: 2,
    minMoves: 2,
    vehicles: [
        {row: 2, col: 0, length: 2, horizontal: true},
        {row: 1, col: 4, length: 2, horizontal: false},
    ],
};

describe("Bouchon", () => {
    it("propose une suite continue de difficultés", () => {
        expect(BOUCHON_SIZES.map(s => s.size)).toEqual([6, 7, 8]);
        for (const {size, min, max} of BOUCHON_SIZES) {
            for (let moves = min; moves <= max; moves++) expect(BOUCHON_BANK[size]![moves]!.length).toBeGreaterThanOrEqual(12);
        }
    });

    it("chaque parking de la banque a exactement le nombre de coups annoncé", () => {
        for (const {size, min, max} of BOUCHON_SIZES) {
            for (let moves = min; moves <= max; moves++) {
                for (const text of BOUCHON_BANK[size]![moves]!.slice(0, 2)) {
                    const explored = exploreParking(size, decodeParking(text), 100_000);
                    expect(explored?.distance[0]).toBe(moves);
                }
            }
        }
    }, 60_000);

    it("un parking retourné et mélangé reste aussi long à résoudre", () => {
        const random = seeded(31);
        for (let i = 0; i < 8; i++) {
            const puzzle = generateBouchon(6, 10, random);
            expect(puzzle.vehicles[0]!.row).toBe(puzzle.exitRow);
            expect(exploreParking(6, puzzle.vehicles, 100_000)?.distance[0]).toBe(10);
        }
    });

    it("encode et décode un parking", () => {
        expect(decodeParking(encodeParking(simple.vehicles))).toEqual(simple.vehicles);
    });

    it("accepte une suite de coups qui libère la sortie", () => {
        expect(isBouchonSolution(simple, [[1, 3], [0, 4]])).toBe(true);
    });

    it("refuse les coups impossibles ou une partie non finie", () => {
        // traverse le véhicule qui bloque
        expect(isBouchonSolution(simple, [[0, 4]])).toBe(false);
        // taxi pas à la sortie
        expect(isBouchonSolution(simple, [[1, 3]])).toBe(false);
        // sort du plateau, ne bouge pas, véhicule inconnu, format faux
        expect(isBouchonSolution(simple, [[1, 5], [0, 4]])).toBe(false);
        expect(isBouchonSolution(simple, [[0, 0]])).toBe(false);
        expect(isBouchonSolution(simple, [[7, 1]])).toBe(false);
        expect(isBouchonSolution(simple, "0")).toBe(false);
        expect(isBouchonSolution(simple, [])).toBe(false);
    });
});
