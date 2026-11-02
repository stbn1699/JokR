import {describe, expect, it} from "vitest";
import {autoCrossCells, CROSS, EMPTY, type Mark, nextMark, QUEEN, queensConflicts, queensSolution, regionBorders} from "./queensRules.ts";
import type {QueensPuzzle} from "../../Models/queens.model.ts";

// 4×4, une zone par ligne
const puzzle: QueensPuzzle = {size: 4, regions: [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3], queens: []};
const withQueens = (cells: number[]): Mark[] => Array.from({length: 16}, (_, i) => (cells.includes(i) ? QUEEN : EMPTY));

describe("queensRules", () => {
    it("fait défiler vide → croix → dame → vide", () => {
        expect(nextMark(EMPTY)).toBe(CROSS);
        expect(nextMark(CROSS)).toBe(QUEEN);
        expect(nextMark(QUEEN)).toBe(EMPTY);
    });

    it("trace les bordures entre zones", () => {
        expect(regionBorders(0, puzzle)).toEqual({top: false, right: false, bottom: true, left: false});
    });

    it("signale les dames en conflit", () => {
        // même colonne
        expect(queensConflicts(withQueens([1, 9]), puzzle)).toEqual(new Set([1, 9]));
        // se touchent en diagonale
        expect(queensConflicts(withQueens([1, 6]), puzzle)).toEqual(new Set([1, 6]));
        // même zone (même ligne)
        expect(queensConflicts(withQueens([0, 3]), puzzle)).toEqual(new Set([0, 3]));
        expect(queensConflicts(withQueens([1, 7]), puzzle).size).toBe(0);
    });

    it("met des croix automatiques autour d'une dame (ligne, colonne, zone, voisines)", () => {
        // Dame en case 5 (ligne 1, colonne 1) ; zones = lignes
        const crosses = autoCrossCells(withQueens([5]), puzzle);
        // ligne 1 (et sa zone) + colonne 1 + les 8 voisines
        expect(crosses).toEqual(new Set([0, 1, 2, 4, 6, 7, 8, 9, 10, 13]));
        // une case déjà marquée n'est pas concernée
        const marks = withQueens([5]);
        marks[0] = CROSS;
        expect(autoCrossCells(marks, puzzle).has(0)).toBe(false);
    });

    it("donne la solution quand les N dames sont bien placées", () => {
        expect(queensSolution(withQueens([1, 7, 8, 14]), puzzle)).toEqual([1, 7, 8, 14]);
        expect(queensSolution(withQueens([1, 7, 8]), puzzle)).toBeNull();
        expect(queensSolution(withQueens([0, 7, 8, 14]), puzzle)).toBeNull();
    });
});
