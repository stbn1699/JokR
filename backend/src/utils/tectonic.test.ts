import {describe, expect, it} from "vitest";
import {
    blocksCanBeFilled,
    countTectonicClues,
    generateTectonic,
    isTectonicSolution,
    randomRegions,
    regionSizes,
    solveTectonic,
    type TectonicPuzzle,
} from "./tectonic.js";

// Une ligne de 4 cases, deux zones de 2 cases : 1 . | . .  → seule solution 1 2 | 1 2
const small: TectonicPuzzle = {width: 4, height: 1, regions: [0, 0, 1, 1], cells: [1, null, null, null]};

describe("tectonic", () => {
    it("découpe la grille en zones de 1 à 5 cases reliées", () => {
        for (let k = 0; k < 20; k++) {
            const regions = randomRegions(6, 6);
            expect(regions).toHaveLength(36);
            expect(regionSizes(regions).every(s => s >= 1 && s <= 5)).toBe(true);
        }
    });

    it("refuse un carré 2×2 qui ne peut pas avoir 4 nombres différents", () => {
        // Deux zones de 2 cases empilées : le carré n'a que 1 et 2 à se partager
        expect(blocksCanBeFilled(2, 2, [0, 0, 1, 1])).toBe(false);
        expect(blocksCanBeFilled(2, 2, [0, 0, 0, 0])).toBe(true);
    });

    it("trouve la solution unique d'une petite grille", () => {
        const {count, solution} = solveTectonic(small, {limit: 2});
        expect(count).toBe(1);
        expect(solution).toEqual([1, 2, 1, 2]);
    });

    it("génère des grilles à solution unique, avec le nombre de cases demandé", () => {
        for (const size of [5, 6, 7, 8]) {
            const cells = size * size;
            const clues = Math.round(cells * 0.3);
            const puzzle = generateTectonic(size, size, clues);
            expect(countTectonicClues(puzzle)).toBeGreaterThanOrEqual(clues);
            const {count, solution} = solveTectonic(puzzle, {limit: 2});
            expect(count).toBe(1);
            expect(isTectonicSolution(puzzle, solution)).toBe(true);
        }
    });

    it("vérifie une solution envoyée", () => {
        expect(isTectonicSolution(small, [1, 2, 1, 2])).toBe(true);
        // nombre donné modifié
        expect(isTectonicSolution(small, [2, 1, 2, 1])).toBe(false);
        // deux voisins identiques
        expect(isTectonicSolution({...small, cells: Array(4).fill(null)}, [1, 2, 2, 1])).toBe(false);
        // case vide, nombre trop grand pour la zone, mauvais format
        expect(isTectonicSolution(small, [1, 2, 1, 0])).toBe(false);
        expect(isTectonicSolution(small, [1, 2, 1, 3])).toBe(false);
        expect(isTectonicSolution(small, "1,2,1,2")).toBe(false);
    });
});
