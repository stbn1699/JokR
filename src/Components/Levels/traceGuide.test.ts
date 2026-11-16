import {describe, expect, it} from "vitest";
import {TRACE_LEVELS, TRACE_TUTORIAL} from "../../../backend/src/utils/traceLevels.ts";
import {isTraceSolution} from "../../../backend/src/utils/trace.ts";
import {nextTraceStep, solveTraceWithGuide} from "./traceGuide.ts";

const [lesson1, lesson2, lesson3] = TRACE_LEVELS;
const start = (p: typeof lesson1) => [p!.numbers.find(n => n.value === 1)!.cell];

describe("guide du tutoriel du Tracé", () => {
    it("3 leçons, que le guide trace jusqu'au bout, avec un chemin juste", () => {
        expect(TRACE_TUTORIAL).toBe(3);
        for (const lesson of TRACE_LEVELS.slice(0, TRACE_TUTORIAL)) {
            const {solved, path} = solveTraceWithGuide(lesson);
            expect(solved).toBe(true);
            expect(isTraceSolution(lesson, path)).toBe(true);
        }
    });

    it("leçon 1 : un seul passage à chaque pas", () => {
        expect(solveTraceWithGuide(lesson1!, ["only"]).solved).toBe(true);
    });

    it("leçon 2 : commence par « dans l'ordre », et en a besoin", () => {
        expect(nextTraceStep(lesson2!, start(lesson2))?.rule).toBe("order");
        expect(solveTraceWithGuide(lesson2!, ["only"]).solved).toBe(false);
        expect(solveTraceWithGuide(lesson2!, ["only", "order"]).solved).toBe(true);
    });

    it("leçon 3 : commence par un cul-de-sac, et en a besoin", () => {
        expect(nextTraceStep(lesson3!, start(lesson3))?.rule).toBe("deadend");
        expect(solveTraceWithGuide(lesson3!, ["only", "order"]).solved).toBe(false);
    });
});
