import {describe, expect, it} from "vitest";
import {QUEENS_LEVELS, QUEENS_TUTORIAL} from "../../../backend/src/utils/queensLevels.ts";
import {nextStep, solveWithGuide, startMarks} from "./queensGuide.ts";

const [lesson1, lesson2, lesson3] = QUEENS_LEVELS;

describe("guide du tutoriel du Queens", () => {
    it("3 leçons, que le guide résout jusqu'au bout", () => {
        expect(QUEENS_TUTORIAL).toBe(3);
        for (const lesson of QUEENS_LEVELS.slice(0, QUEENS_TUTORIAL)) expect(solveWithGuide(lesson).solved).toBe(true);
    });

    it("leçon 1 : les bases suffisent (dame qui bloque, dernière case libre)", () => {
        expect(solveWithGuide(lesson1!, ["attacks", "single"]).solved).toBe(true);
        expect(nextStep(lesson1!, startMarks(lesson1!))?.rule).toBe("attacks");
    });

    it("leçon 2 : commence par une zone de deux cases sur une seule ligne, et en a besoin", () => {
        const first = nextStep(lesson2!, startMarks(lesson2!));
        expect(first?.rule).toBe("confined1");
        expect(first?.spotlight).toHaveLength(2);
        expect(solveWithGuide(lesson2!, ["attacks", "single"]).solved).toBe(false);
        expect(solveWithGuide(lesson2!, ["attacks", "single", "confined1"]).solved).toBe(true);
    });

    it("leçon 3 : commence par deux zones sur deux lignes, et en a besoin", () => {
        expect(nextStep(lesson3!, startMarks(lesson3!))?.rule).toBe("confined2");
        expect(solveWithGuide(lesson3!, ["attacks", "single", "confined1"]).solved).toBe(false);
        expect(solveWithGuide(lesson3!, ["attacks", "single", "confined1", "confined2"]).solved).toBe(true);
    });

    it("niveaux 4 à 120 : seulement les techniques du tutoriel, en continuité", () => {
        const tutorialRules = ["attacks", "single", "confined1", "confined2"] as const;
        for (const level of QUEENS_LEVELS.slice(QUEENS_TUTORIAL, 120)) {
            expect(solveWithGuide(level, [...tutorialRules]).solved).toBe(true);
            // chaque niveau a besoin d'au moins une technique du tutoriel (pas que les bases)
            expect(solveWithGuide(level, ["attacks", "single"]).solved).toBe(false);
        }
    });

    it("les cases à barrer ne contiennent jamais la dame de la solution", () => {
        for (const lesson of QUEENS_LEVELS.slice(0, QUEENS_TUTORIAL)) {
            let marks = startMarks(lesson);
            const crossed = new Set<number>();
            for (let step = nextStep(lesson, marks); step; step = nextStep(lesson, marks)) {
                if (step.mark === "cross") step.targets.forEach(t => crossed.add(t));
                marks = marks.map((m, i) => (step!.targets.includes(i) ? (step!.mark === "queen" ? 2 : 1) : m));
            }
            const queens = marks.map((m, i) => (m === 2 ? i : -1)).filter(i => i >= 0);
            expect(queens.some(q => crossed.has(q))).toBe(false);
        }
    });
});
