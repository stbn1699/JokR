import {generateSudoku} from "../utils/sudokuGenerator.js";

/*
 * Plage de cases vides proposée au joueur.
 * Mesuré : jusqu'à 55 cases vides, le générateur tombe pile sur la cible en moins de 100 ms.
 * Au-delà, il n'y arrive plus de façon fiable (grilles trop difficiles pour la résolution logique).
 */
export const SUDOKU_LIMITS = {
    minEmptyCells: 20,
    maxEmptyCells: 55,
    defaultEmptyCells: 40,
} as const;

const MAX_GENERATION_ATTEMPTS = 5;

export class SudokuService {
    // Génère une grille avec exactement `cluesCount` indices si possible (quelques essais),
    // sinon la plus proche obtenue (toujours au moins `cluesCount` indices)
    async generate(cluesCount: number): Promise<number[][]> {
        let best = generateSudoku(cluesCount);
        for (let attempt = 1; attempt < MAX_GENERATION_ATTEMPTS && countClues(best) !== cluesCount; attempt++) {
            const grid = generateSudoku(cluesCount);
            if (countClues(grid) < countClues(best)) best = grid;
        }
        return best;
    }

    // XP gagnée pour chaque nombre de cases vides proposé (affichée avant de générer)
    xpTable(baseXp: number): Record<number, number> {
        const table: Record<number, number> = {};
        for (let empty = SUDOKU_LIMITS.minEmptyCells; empty <= SUDOKU_LIMITS.maxEmptyCells; empty++) {
            table[empty] = this.computeXp(baseXp, 81 - empty);
        }
        return table;
    }

    // XP gagnée selon la difficulté : xp = baseXp × (40 / cluesCount)^1.1, bornée entre 20 et 300
    computeXp(baseXp: number, cluesCount: number): number {
        const referenceClues = 40;
        const exponent = 1.1;
        const xp = Math.round(baseXp * Math.pow(referenceClues / Math.max(1, cluesCount), exponent));
        return Math.max(20, Math.min(xp, 300));
    }

    // true si chaque chiffre donné au départ (case non nulle du puzzle) est toujours à sa place
    respectsClues(puzzle: number[][], grid: number[][]): boolean {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const clue = puzzle[r]![c]!;
                if (clue !== 0 && grid[r]![c] !== clue) return false;
            }
        }
        return true;
    }

    // validate checks a completed 9x9 sudoku grid and returns true if it's a valid solution
    validate(grid: unknown): grid is number[][] {
        // basic shape check: must be array of 9 arrays of 9 numbers
        if (!Array.isArray(grid) || grid.length !== 9) return false;
        for (const row of grid) {
            if (!Array.isArray(row) || row.length !== 9) return false;
            for (const v of row as unknown[]) {
                // ensure it's an integer between 1 and 9
                if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 9) return false;
            }
        }

        // helper to check group contains 1..9 exactly once
        function isValidGroup(arr: number[]) {
            const seen = new Set<number>();
            for (const n of arr) {
                if (n < 1 || n > 9) return false;
                if (seen.has(n)) return false;
                seen.add(n);
            }
            return seen.size === 9;
        }

        // check rows
        for (let r = 0; r < 9; r++) {
            if (!isValidGroup(grid[r] as number[])) return false;
        }

        // check columns
        for (let c = 0; c < 9; c++) {
            const col: number[] = [];
            for (let r = 0; r < 9; r++) col.push((grid[r] as number[])[c]!);
            if (!isValidGroup(col)) return false;
        }

        // check 3x3 blocks
        for (let br = 0; br < 3; br++) {
            for (let bc = 0; bc < 3; bc++) {
                const block: number[] = [];
                for (let r = 0; r < 3; r++) {
                    for (let c = 0; c < 3; c++) {
                        block.push((grid[br * 3 + r] as number[])[bc * 3 + c]!);
                    }
                }
                if (!isValidGroup(block)) return false;
            }
        }

        return true;
    }
}

export function countClues(grid: number[][]): number {
    return grid.flat().filter(v => v !== 0).length;
}
