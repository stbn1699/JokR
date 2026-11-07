import {describe, expect, it} from "vitest";
import {countClues, SUDOKU_LIMITS, SudokuService} from "./Sudoku.service.js";

// Grille résolue valide
const SOLVED = [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

const clone = (g: number[][]) => g.map(r => r.slice());
const service = new SudokuService();

describe("SudokuService.validate", () => {
    it("accepte une grille résolue valide", () => {
        expect(service.validate(SOLVED)).toBe(true);
    });

    it("refuse un doublon dans une ligne", () => {
        const g = clone(SOLVED);
        g[0]![0] = 3; // 3 est déjà en (0,1)
        expect(service.validate(g)).toBe(false);
    });

    it("refuse une grille où deux colonnes sont échangées dans des blocs différents", () => {
        // Lignes et colonnes restent valides... sauf les blocs 3×3
        const g = SOLVED.map(r => [r[3]!, r[1]!, r[2]!, r[0]!, ...r.slice(4)]);
        expect(service.validate(g)).toBe(false);
    });

    it("refuse une case vide ou hors 1-9", () => {
        const g = clone(SOLVED);
        g[4]![4] = 0;
        expect(service.validate(g)).toBe(false);
        g[4]![4] = 10;
        expect(service.validate(g)).toBe(false);
    });

    it("refuse une forme invalide", () => {
        expect(service.validate(null)).toBe(false);
        expect(service.validate("grid")).toBe(false);
        expect(service.validate(SOLVED.slice(0, 8))).toBe(false);
        expect(service.validate(SOLVED.map(r => r.map(String)))).toBe(false);
    });
});

describe("SudokuService.respectsClues", () => {
    const puzzle = SOLVED.map((row, r) => row.map((v, c) => ((r + c) % 3 === 0 ? v : 0)));

    it("accepte une solution qui garde les indices de départ", () => {
        expect(service.respectsClues(puzzle, SOLVED)).toBe(true);
    });

    it("refuse une autre grille valide qui ne garde pas les indices (anti-triche)", () => {
        // Permutation des chiffres : toujours une grille valide, mais pas la solution de ce puzzle
        const other = SOLVED.map(r => r.map(v => (v % 9) + 1));
        expect(service.validate(other)).toBe(true);
        expect(service.respectsClues(puzzle, other)).toBe(false);
    });
});

describe("SudokuService.computeXp", () => {
    it("donne baseXp pour 40 indices (référence)", () => {
        expect(service.computeXp(50, 40)).toBe(50);
    });

    it("donne plus d'XP quand il y a moins d'indices", () => {
        expect(service.computeXp(50, 25)).toBeGreaterThan(service.computeXp(50, 40));
    });

    it("reste entre 5 et 500", () => {
        expect(service.computeXp(10, 81)).toBe(5);
        expect(service.computeXp(1000, 17)).toBe(500);
        expect(service.computeXp(50, 0)).toBe(500);
    });
});

describe("SudokuService.xpTable", () => {
    it("donne l'XP pour chaque nombre de cases vides proposé", () => {
        const table = service.xpTable(50);
        const keys = Object.keys(table).map(Number);
        expect(Math.min(...keys)).toBe(SUDOKU_LIMITS.minEmptyCells);
        expect(Math.max(...keys)).toBe(SUDOKU_LIMITS.maxEmptyCells);
        // même calcul que celui de la validation
        expect(table[41]).toBe(service.computeXp(50, 40));
    });

    it("donne plus d'XP quand il y a plus de cases à remplir", () => {
        const table = service.xpTable(50);
        expect(table[SUDOKU_LIMITS.maxEmptyCells]!).toBeGreaterThan(table[SUDOKU_LIMITS.minEmptyCells]!);
    });
});

describe("SudokuService.generate", () => {
    it("renvoie le nombre d'indices demandé sur toute la plage proposée", async () => {
        for (const empty of [SUDOKU_LIMITS.minEmptyCells, SUDOKU_LIMITS.defaultEmptyCells, SUDOKU_LIMITS.maxEmptyCells]) {
            const grid = await service.generate(81 - empty);
            expect(countClues(grid)).toBe(81 - empty);
        }
    });
});
