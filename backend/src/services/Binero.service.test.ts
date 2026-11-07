import {describe, expect, it} from "vitest";
import {BINERO_DEFAULT_SIZE, BINERO_SIZES, BineroService, bineroLimits, toApiGrid} from "./Binero.service.js";
import {countBineroClues, EMPTY, generateSolution} from "../utils/binero.js";

const service = new BineroService();

describe("BineroService.computeXp", () => {
    it("donne baseXp pour une grille 8×8 à moitié vide (référence)", () => {
        expect(service.computeXp(50, 8, 32)).toBe(50);
    });

    it("rapporte plus pour une grille plus grande ou plus vide", () => {
        expect(service.computeXp(50, 12, 72)).toBeGreaterThan(service.computeXp(50, 8, 32));
        expect(service.computeXp(50, 8, 44)).toBeGreaterThan(service.computeXp(50, 8, 20));
    });

    it("reste entre 5 et 500", () => {
        expect(service.computeXp(50, 6, 1)).toBe(5);
        expect(service.computeXp(5000, 12, 80)).toBe(500);
    });
});

describe("BineroService.settings", () => {
    it("décrit chaque taille avec sa plage et l'XP de chaque valeur", () => {
        const settings = service.settings(50);
        expect(settings.defaultSize).toBe(BINERO_DEFAULT_SIZE);
        expect(settings.sizes.map(s => s.size)).toEqual(BINERO_SIZES.map(s => s.size));
        for (const s of settings.sizes) {
            const keys = Object.keys(s.xpByEmptyCells).map(Number);
            expect(Math.min(...keys)).toBe(s.minEmptyCells);
            expect(Math.max(...keys)).toBe(s.maxEmptyCells);
            expect(s.defaultEmptyCells).toBeGreaterThanOrEqual(s.minEmptyCells);
            expect(s.defaultEmptyCells).toBeLessThanOrEqual(s.maxEmptyCells);
            // même calcul que celui de la validation
            expect(s.xpByEmptyCells[s.defaultEmptyCells]).toBe(service.computeXp(50, s.size, s.defaultEmptyCells));
        }
    });

    it("ne connaît que les tailles proposées", () => {
        expect(bineroLimits(8)).toBeDefined();
        expect(bineroLimits(7)).toBeUndefined();
        expect(bineroLimits(14)).toBeUndefined();
    });
});

describe("BineroService.generate", () => {
    it("renvoie exactement le nombre de chiffres demandé, aux limites de chaque taille", () => {
        for (const {size, maxEmptyCells, minEmptyCells} of BINERO_SIZES) {
            for (const empty of [minEmptyCells, maxEmptyCells]) {
                expect(countBineroClues(service.generate(size, size * size - empty))).toBe(size * size - empty);
            }
        }
    });
});

describe("BineroService.validate et respectsClues", () => {
    const solution = generateSolution(6);

    it("accepte une solution valide de la bonne taille", () => {
        expect(service.validate(solution, 6)).toBe(true);
    });

    it("refuse une mauvaise taille ou des valeurs invalides", () => {
        expect(service.validate(solution, 8)).toBe(false);
        expect(service.validate(null, 6)).toBe(false);
        expect(service.validate(solution.map(r => r.map(v => (v === 1 ? 2 : v))), 6)).toBe(false);
        expect(service.validate(solution.map(r => r.map(String)), 6)).toBe(false);
    });

    it("vérifie que les chiffres de départ sont conservés", () => {
        const puzzle = solution.map((row, r) => row.map((v, c) => ((r + c) % 2 === 0 ? v : EMPTY)));
        expect(service.respectsClues(puzzle, solution)).toBe(true);
        // Inverser tous les chiffres garde une grille valide, mais pas les chiffres de départ (anti-triche)
        const inverted = solution.map(r => r.map(v => 1 - v));
        expect(service.validate(inverted, 6)).toBe(true);
        expect(service.respectsClues(puzzle, inverted)).toBe(false);
    });
});

describe("toApiGrid", () => {
    it("remplace les cases vides par null", () => {
        expect(toApiGrid([[0, EMPTY], [EMPTY, 1]])).toEqual([[0, null], [null, 1]]);
    });
});
