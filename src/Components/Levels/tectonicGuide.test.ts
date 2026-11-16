import {describe, expect, it} from "vitest";
import {TECTONIC_LEVELS, TECTONIC_TUTORIAL} from "../../../backend/src/utils/tectonicLevels.ts";
import {solveTectonic} from "../../../backend/src/utils/tectonic.ts";
import {nextTectonicStep, solveTectonicWithGuide} from "./tectonicGuide.ts";

const [lesson1, lesson2, lesson3] = TECTONIC_LEVELS;

describe("guide du tutoriel du Tectonic", () => {
    it("3 leçons, que le guide résout jusqu'au bout, avec la bonne solution", () => {
        expect(TECTONIC_TUTORIAL).toBe(3);
        for (const lesson of TECTONIC_LEVELS.slice(0, TECTONIC_TUTORIAL)) {
            const {solved, values} = solveTectonicWithGuide(lesson, lesson.cells);
            expect(solved).toBe(true);
            expect(values).toEqual(solveTectonic(lesson, {limit: 2}).solution);
        }
    });

    it("leçon 1 : le dernier nombre suffit", () => {
        expect(solveTectonicWithGuide(lesson1!, lesson1!.cells, ["last"]).solved).toBe(true);
    });

    it("leçon 2 : commence par la seule place, et en a besoin", () => {
        expect(nextTectonicStep(lesson2!, lesson2!.cells)?.rule).toBe("hidden");
        expect(solveTectonicWithGuide(lesson2!, lesson2!.cells, ["last"]).solved).toBe(false);
        expect(solveTectonicWithGuide(lesson2!, lesson2!.cells, ["last", "hidden"]).solved).toBe(true);
    });

    it("leçon 3 : commence par le seul nombre, et en a besoin", () => {
        expect(nextTectonicStep(lesson3!, lesson3!.cells)?.rule).toBe("naked");
        expect(solveTectonicWithGuide(lesson3!, lesson3!.cells, ["last", "hidden"]).solved).toBe(false);
    });
});
