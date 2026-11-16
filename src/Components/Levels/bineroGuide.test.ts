import {describe, expect, it} from "vitest";
import {BINERO_LEVELS, BINERO_TUTORIAL} from "../../../backend/src/utils/bineroLevels.ts";
import {logicalSolve} from "../../../backend/src/utils/binero.ts";
import {type BineroValue, nextBineroStep, solveBineroWithGuide} from "./bineroGuide.ts";

const flat = (grid: number[][]): BineroValue[] => grid.flat().map(v => (v === -1 ? null : v as 0 | 1));
const lessons = BINERO_LEVELS.slice(0, BINERO_TUTORIAL).map(g => ({size: g.length, values: flat(g), grid: g}));
const [lesson1, lesson2, lesson3] = lessons;

describe("guide du tutoriel du Binero", () => {
    it("3 leçons, que le guide résout jusqu'au bout, avec la bonne solution", () => {
        expect(BINERO_TUTORIAL).toBe(3);
        for (const lesson of lessons) {
            const {solved, values} = solveBineroWithGuide(lesson.size, lesson.values);
            expect(solved).toBe(true);
            expect(values).toEqual(logicalSolve(lesson.grid).grid.flat());
        }
    });

    it("leçon 1 : pas trois à la suite suffit, avec la paire et le sandwich", () => {
        const {solved, rules} = solveBineroWithGuide(lesson1!.size, lesson1!.values, ["pair", "sandwich"]);
        expect(solved).toBe(true);
        expect(rules).toContain("pair");
        expect(rules).toContain("sandwich");
    });

    it("leçon 2 : a besoin du comptage", () => {
        expect(solveBineroWithGuide(lesson2!.size, lesson2!.values, ["pair", "sandwich"]).solved).toBe(false);
        expect(solveBineroWithGuide(lesson2!.size, lesson2!.values, ["pair", "sandwich", "count"]).solved).toBe(true);
    });

    it("leçon 3 : a besoin de « pas deux lignes pareilles »", () => {
        expect(solveBineroWithGuide(lesson3!.size, lesson3!.values, ["pair", "sandwich", "count"]).solved).toBe(false);
        expect(solveBineroWithGuide(lesson3!.size, lesson3!.values).solved).toBe(true);
    });

    it("ne se trompe jamais : chaque déduction donne le chiffre de la solution", () => {
        for (const lesson of lessons) {
            const solution = logicalSolve(lesson.grid).grid.flat();
            let values = lesson.values;
            for (let step = nextBineroStep(lesson.size, values); step; step = nextBineroStep(lesson.size, values)) {
                for (const t of step.targets) expect(t.digit).toBe(solution[t.cell]);
                values = values.map((v, i) => step!.targets.find(t => t.cell === i)?.digit ?? v);
            }
        }
    });
});
