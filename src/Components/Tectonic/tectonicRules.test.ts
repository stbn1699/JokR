import {describe, expect, it} from "vitest";
import {expectedCounts, notesAfterPlacing, regionBorders, tectonicConflicts} from "./tectonicRules.ts";
import type {TectonicPuzzle} from "../../Models/tectonic.model.ts";

// 3×2 : zone 0 = colonne de gauche (2 cases), zone 1 = les 4 autres cases
//   0 1 1
//   0 1 1
const puzzle: TectonicPuzzle = {width: 3, height: 2, regions: [0, 1, 1, 0, 1, 1], cells: Array(6).fill(null)};

describe("tectonicRules", () => {
    it("trace les bordures entre zones (pas au bord de la grille)", () => {
        expect(regionBorders(0, puzzle)).toEqual({top: false, right: true, bottom: false, left: false});
        expect(regionBorders(1, puzzle)).toEqual({top: false, right: false, bottom: false, left: true});
    });

    it("compte combien de fois chaque nombre doit apparaître", () => {
        expect(expectedCounts(puzzle)).toEqual({1: 2, 2: 2, 3: 1, 4: 1});
    });

    it("signale les nombres trop grands, en double dans une zone ou voisins", () => {
        // 3 dans une zone de 2 cases
        expect([...tectonicConflicts([3, null, null, null, null, null], puzzle)]).toEqual([0]);
        // deux 1 dans la zone 1 (et voisins)
        expect(tectonicConflicts([null, 1, null, null, null, 1], puzzle)).toEqual(new Set([1, 5]));
        // deux 2 voisins en diagonale, dans des zones différentes
        expect(tectonicConflicts([2, null, null, null, 2, null], puzzle)).toEqual(new Set([0, 4]));
        // grille correcte
        expect(tectonicConflicts([1, 3, 1, 2, 4, 2], puzzle).size).toBe(0);
    });

    it("un nombre posé retire ce nombre des notes de sa zone et des cases autour", () => {
        // 4×1 : zones [0, 0, 1, 1] ; toutes les cases ont 1 et 2 en notes (bits 1 et 2 = 6)
        const line: TectonicPuzzle = {width: 4, height: 1, regions: [0, 0, 1, 1], cells: Array(4).fill(null)};
        const after = notesAfterPlacing([6, 6, 6, 6], 0, 1, line);
        // case 0 : notes effacées ; case 1 (même zone et voisine) : plus de 1 ; cases 2 et 3 : inchangées
        expect(after).toEqual([0, 4, 6, 6]);
        // case 2 posée à 2 : sa voisine 1 et sa zone (case 3) perdent le 2
        expect(notesAfterPlacing([6, 6, 6, 6], 2, 2, line)).toEqual([6, 2, 0, 2]);
    });
});
