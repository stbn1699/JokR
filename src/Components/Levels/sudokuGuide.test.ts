import {describe, expect, it} from "vitest";
import {SUDOKU_LEVELS, SUDOKU_TUTORIAL} from "../../../backend/src/utils/sudokuLevels.ts";
import {nextSudokuStep, solveSudokuWithGuide} from "./sudokuGuide.ts";

const lessons = SUDOKU_LEVELS.slice(0, SUDOKU_TUTORIAL).map(g => g.flat());
const [lesson1, lesson2, lesson3] = lessons;

describe("guide du tutoriel du Sudoku", () => {
    it("3 leçons, que le guide résout jusqu'au bout", () => {
        expect(SUDOKU_TUTORIAL).toBe(3);
        for (const lesson of lessons) expect(solveSudokuWithGuide(lesson).solved).toBe(true);
    });

    it("leçon 1 : le dernier chiffre suffit", () => {
        expect(solveSudokuWithGuide(lesson1!, ["last"]).solved).toBe(true);
    });

    it("leçon 2 : a besoin de la seule place, et l'utilise tout de suite", () => {
        expect(solveSudokuWithGuide(lesson2!, ["last"]).solved).toBe(false);
        expect(solveSudokuWithGuide(lesson2!, ["last", "hidden"]).rules.slice(0, 2)).toContain("hidden");
        expect(solveSudokuWithGuide(lesson2!, ["last", "hidden"]).solved).toBe(true);
    });

    it("leçon 3 : commence par le seul chiffre, et en a besoin", () => {
        expect(nextSudokuStep(lesson3!)?.rule).toBe("naked");
        expect(solveSudokuWithGuide(lesson3!, ["last", "hidden"]).solved).toBe(false);
    });

    it("ne se trompe jamais : chaque chiffre posé respecte les règles", () => {
        for (const lesson of lessons) {
            const {values} = solveSudokuWithGuide(lesson);
            for (let k = 0; k < 9; k++) {
                const row = values.slice(k * 9, k * 9 + 9);
                const col = Array.from({length: 9}, (_, r) => values[r * 9 + k]);
                const box = Array.from({length: 9}, (_, j) => values[(Math.floor(k / 3) * 3 + Math.floor(j / 3)) * 9 + (k % 3) * 3 + (j % 3)]);
                for (const g of [row, col, box]) expect(new Set(g).size).toBe(9);
            }
        }
    });
});
