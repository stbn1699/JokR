import {generateSudoku} from "../utils/sudokuGenerator.js";

export class SudokuService {
    // generate returns a grid with approximately numPlaced clues (could be more if target can't be reached)
    async generate(numPlaced: number): Promise<number[][]> {
        return generateSudoku(numPlaced);
    }

    // validate checks a completed 9x9 sudoku grid and returns true if it's a valid solution
    validate(grid: unknown): boolean {
        // basic shape check: must be array of 9 arrays of 9 numbers
        if (!Array.isArray(grid) || grid.length !== 9) return false;
        for (const row of grid) {
            if (!Array.isArray(row) || row.length !== 9) return false;
            for (const v of row) {
                // v may be any; ensure it's an integer between 1 and 9
                if (!Number.isInteger(v as any) || (v as any) < 1 || (v as any) > 9) return false;
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
