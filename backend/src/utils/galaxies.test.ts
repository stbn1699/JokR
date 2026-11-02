import {describe, expect, it} from "vitest";
import {
    coreCells,
    type GalaxiesPuzzle,
    generateGalaxies,
    isGalaxiesSolution,
    mirrorCell,
    randomGalaxies,
    solveGalaxies,
    targetDots,
    wallBetween,
    wallCells,
    wallsOf,
} from "./galaxies.js";

// 2×2 : un point au milieu du côté entre les deux cases du haut, un autre entre les deux du bas
//   a a
//   b b
const small: GalaxiesPuzzle = {width: 2, height: 2, dots: [[1, 2], [3, 2]], walls: []};

describe("galaxies", () => {
    it("calcule symétriques, cœurs et murs", () => {
        // case (0,0) autour du centre de la grille 2×2 (coin commun, (2,2)) → case (1,1)
        expect(mirrorCell(0, [2, 2], 2, 2)).toBe(3);
        expect(mirrorCell(0, [1, 1], 2, 2)).toBe(0);
        // autour du centre de la case (1,1), le symétrique de (0,0) sort de la grille
        expect(mirrorCell(0, [3, 3], 2, 2)).toBe(-1);
        expect(coreCells([2, 2], 2).sort()).toEqual([0, 1, 2, 3]);
        expect(coreCells([1, 2], 2).sort()).toEqual([0, 1]);
        // 2×2 : mur sous la case 0 = 0, mur à droite de la case 0 = 2
        expect(wallBetween(0, 2, 2, 2)).toBe(0);
        expect(wallBetween(0, 1, 2, 2)).toBe(2);
        expect(wallCells(2, 2, 2)).toEqual([0, 1]);
        expect(wallsOf([0, 0, 1, 1], 2, 2)).toEqual([0, 1]);
    });

    it("découpe la grille en galaxies symétriques valides", () => {
        for (let k = 0; k < 20; k++) {
            const {dots, regions} = randomGalaxies(6, 6, 12);
            expect(isGalaxiesSolution({width: 6, height: 6, dots, walls: []}, regions)).toBe(true);
        }
    });

    it("résout une petite grille", () => {
        const {count, solution} = solveGalaxies(small);
        expect(count).toBe(1);
        expect(solution).toEqual([0, 0, 1, 1]);
    });

    it("génère des grilles à solution unique, avec les murs d'aide demandés", () => {
        for (const size of [5, 7, 9]) {
            const {puzzle, solution} = generateGalaxies(size, size, 4);
            expect(puzzle.dots).toHaveLength(targetDots(size, size));
            expect(puzzle.walls).toHaveLength(4);
            expect(solveGalaxies({...puzzle, walls: []}).count).toBe(1);
            expect(isGalaxiesSolution(puzzle, solution)).toBe(true);
        }
    });

    it("vérifie une solution envoyée", () => {
        expect(isGalaxiesSolution(small, [0, 0, 1, 1])).toBe(true);
        // point hors de sa galaxie / galaxie pas symétrique
        expect(isGalaxiesSolution(small, [1, 1, 0, 0])).toBe(false);
        expect(isGalaxiesSolution(small, [0, 0, 0, 1])).toBe(false);
        // mur donné qui coupe une galaxie
        expect(isGalaxiesSolution({...small, walls: [2]}, [0, 0, 1, 1])).toBe(false);
        // mauvais format
        expect(isGalaxiesSolution(small, [0, 0, 1])).toBe(false);
        expect(isGalaxiesSolution(small, "0011")).toBe(false);
    });
});
