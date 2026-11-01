import {describe, expect, it} from "vitest";
import {generateSudoku} from "./sudokuGenerator.js";
import {countSolutions} from "./sudokuSolver.js";
import {SudokuService} from "../services/Sudoku.service.js";

const clues = (grid: number[][]) => grid.flat().filter(v => v !== 0).length;

// Résout la grille par backtracking (pour vérifier qu'elle a bien une solution valide)
function solve(grid: number[][]): number[][] {
    const g = grid.map(r => r.slice());
    const ok = (r: number, c: number, n: number) => {
        for (let i = 0; i < 9; i++) if (g[r]![i] === n || g[i]![c] === n) return false;
        const br = r - (r % 3), bc = c - (c % 3);
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (g[br + i]![bc + j] === n) return false;
        return true;
    };
    const run = (): boolean => {
        for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (g[r]![c] === 0) {
            for (let n = 1; n <= 9; n++) if (ok(r, c, n)) {
                g[r]![c] = n;
                if (run()) return true;
                g[r]![c] = 0;
            }
            return false;
        }
        return true;
    };
    run();
    return g;
}

describe("generateSudoku", () => {
    it("renvoie une grille 9×9 avec des valeurs entre 0 et 9", () => {
        const grid = generateSudoku(40);
        expect(grid).toHaveLength(9);
        for (const row of grid) {
            expect(row).toHaveLength(9);
            for (const v of row) expect(v >= 0 && v <= 9).toBe(true);
        }
    });

    it("laisse au moins le nombre d'indices demandé", () => {
        for (const target of [56, 40, 31]) {
            expect(clues(generateSudoku(target))).toBeGreaterThanOrEqual(target);
        }
    });

    it("produit une grille à solution unique, et cette solution est valide", () => {
        const grid = generateSudoku(31);
        expect(countSolutions(grid, 2)).toBe(1);

        const service = new SudokuService();
        const solution = solve(grid);
        expect(service.validate(solution)).toBe(true);
        expect(service.respectsClues(grid, solution)).toBe(true);
    });

    // La difficulté maximale (26 indices) est testée via SudokuService.generate, qui réessaie
    it("tombe pile sur la cible", () => {
        for (const target of [61, 41, 31]) {
            expect(clues(generateSudoku(target))).toBe(target);
        }
    });

    it("reste rapide sur une cible impossible (pas de boucle infinie dans le solveur)", () => {
        // 17 indices n'est quasiment jamais atteignable par résolution logique :
        // le générateur doit abandonner vite au lieu de bloquer le serveur
        const start = Date.now();
        const grid = generateSudoku(17);
        expect(Date.now() - start).toBeLessThan(3000);
        expect(countSolutions(grid, 2)).toBe(1);
    });

    it("renvoie la grille complète si on demande 81 indices", () => {
        expect(clues(generateSudoku(81))).toBe(81);
    });
});
