import {describe, expect, it} from "vitest";
import {analyzeBoard, wallOnSide, wallsThroughDots} from "./galaxiesRules.ts";
import type {GalaxiesPuzzle} from "../../Models/galaxies.model.ts";

// 2×2 : un point entre les deux cases du haut, un entre les deux du bas.
// Murs : 0 = sous la case 0, 1 = sous la case 1, 2 = à droite de la case 0, 3 = à droite de la case 2
const puzzle: GalaxiesPuzzle = {width: 2, height: 2, dots: [[1, 2], [3, 2]], walls: []};

describe("galaxiesRules", () => {
    it("trouve le mur de chaque côté d'une case", () => {
        expect(wallOnSide(0, "bottom", 2, 2)).toBe(0);
        expect(wallOnSide(0, "right", 2, 2)).toBe(2);
        expect(wallOnSide(0, "top", 2, 2)).toBeNull();
        expect(wallOnSide(3, "left", 2, 2)).toBe(3);
    });

    it("repère les murs qui traversent un point", () => {
        expect(wallsThroughDots(puzzle)).toEqual(new Set([2, 3]));
    });

    it("sans mur : une seule zone à deux points, pas encore finie", () => {
        const a = analyzeBoard(puzzle, new Set());
        expect(a.regions).toHaveLength(1);
        expect(a.regions[0]!.status).toBe("open");
        expect(a.solution).toBeNull();
    });

    it("bon découpage : deux galaxies valides, et la solution", () => {
        const a = analyzeBoard(puzzle, new Set([0, 1]));
        expect(a.regions.map(r => r.status)).toEqual(["valid", "valid"]);
        expect(a.solution).toEqual([0, 0, 1, 1]);
    });

    it("signale un mur à travers un point et les zones impossibles", () => {
        const a = analyzeBoard(puzzle, new Set([0, 1, 2]));
        expect(a.badWalls).toEqual(new Set([2]));
        expect(a.solution).toBeNull();
        // Zone sans point : 3×1 avec un seul point au centre de la case de gauche
        const line: GalaxiesPuzzle = {width: 3, height: 1, dots: [[1, 1]], walls: []};
        const b = analyzeBoard(line, new Set([0]));
        expect(b.regions.map(r => r.status)).toEqual(["valid", "error"]);
    });
});
