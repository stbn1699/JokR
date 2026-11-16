import {describe, expect, it} from "vitest";
import {RIKUDO_LEVELS, RIKUDO_TUTORIAL} from "../../../backend/src/utils/rikudoLevels.ts";
import {isRikudoSolution} from "../../../backend/src/utils/rikudo.ts";
import {nextRikudoStep, solveRikudoWithGuide} from "./rikudoGuide.ts";

const [lesson1, lesson2, lesson3] = RIKUDO_LEVELS;

describe("guide du tutoriel du Rikudo", () => {
    it("3 leçons, que le guide résout jusqu'au bout, avec une vraie solution", () => {
        expect(RIKUDO_TUTORIAL).toBe(3);
        for (const lesson of RIKUDO_LEVELS.slice(0, RIKUDO_TUTORIAL)) {
            const {solved, values} = solveRikudoWithGuide(lesson, lesson.cells);
            expect(solved).toBe(true);
            expect(isRikudoSolution(lesson, values)).toBe(true);
        }
    });

    it("leçon 1 : le chaînon manquant suffit", () => {
        expect(solveRikudoWithGuide(lesson1!, lesson1!.cells, ["gap"]).solved).toBe(true);
    });

    it("leçon 2 : commence par la bonne distance, et en a besoin", () => {
        expect(nextRikudoStep(lesson2!, lesson2!.cells)?.rule).toBe("near");
        expect(solveRikudoWithGuide(lesson2!, lesson2!.cells, ["gap"]).solved).toBe(false);
        expect(solveRikudoWithGuide(lesson2!, lesson2!.cells, ["gap", "near"]).solved).toBe(true);
    });

    it("leçon 3 : commence par un point, et en a besoin", () => {
        // le point touche la case à remplir (le tutoriel montre ce point)
        const first = nextRikudoStep(lesson3!, lesson3!.cells);
        expect(first?.rule).toBe("link");
        expect(first?.via).toBe("direct");
        expect(lesson3!.links.some(l => l.includes(first!.cell) && l.includes(first!.linkedTo!))).toBe(true);
        expect(solveRikudoWithGuide(lesson3!, lesson3!.cells, ["gap", "near"]).solved).toBe(false);
    });
});
