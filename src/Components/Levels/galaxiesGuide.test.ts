import {describe, expect, it} from "vitest";
import {GALAXIES_LEVELS, GALAXIES_TUTORIAL} from "../../../backend/src/utils/galaxiesLevels.ts";
import {generateGalaxies, solveGalaxies, wallsOf} from "../../../backend/src/utils/galaxies.ts";
import {planGalaxies} from "./galaxiesGuide.ts";

const [lesson1, lesson2, lesson3] = GALAXIES_LEVELS;
const firstLearn = (p: typeof lesson1) => planGalaxies(p!).steps.find(s => s.kind === "learn");

describe("guide du tutoriel des Galaxies", () => {
    it("3 leçons, que le guide découpe entièrement, avec exactement les murs de la solution", () => {
        expect(GALAXIES_TUTORIAL).toBe(3);
        for (const lesson of GALAXIES_LEVELS.slice(0, GALAXIES_TUTORIAL)) {
            const {steps, solved, owner} = planGalaxies(lesson);
            expect(solved).toBe(true);
            expect(owner).toEqual(solveGalaxies(lesson, 2).solution);
            const traced = steps.flatMap(s => (s.kind === "walls" ? s.walls : [])).sort((a, b) => a - b);
            expect(traced).toEqual(wallsOf(owner, lesson.width, lesson.height));
        }
    });

    it("leçon 1 : les bases suffisent (chaque case touche un point)", () => {
        expect(planGalaxies(lesson1!, []).solved).toBe(true);
    });

    it("leçon 2 : commence par le miroir, et en a besoin", () => {
        expect(firstLearn(lesson2)).toMatchObject({why: "mirror"});
        expect(planGalaxies(lesson2!, []).solved).toBe(false);
        expect(planGalaxies(lesson2!, ["reach"]).solved).toBe(false);
        expect(planGalaxies(lesson2!, ["mirror"]).solved).toBe(true);
    });

    it("leçon 3 : commence par une case enfermée, et en a besoin", () => {
        expect(firstLearn(lesson3)).toMatchObject({why: "reach"});
        expect(planGalaxies(lesson3!, ["mirror"]).solved).toBe(false);
        expect(planGalaxies(lesson3!, ["mirror", "reach"]).solved).toBe(true);
    });

    it("ne se trompe jamais : sur des grilles au hasard, ce qu'il trouve est la solution", () => {
        for (let k = 0; k < 40; k++) {
            const {puzzle, solution} = generateGalaxies(6, 6, 0);
            const {owner} = planGalaxies(puzzle);
            owner.forEach((o, i) => o >= 0 && expect(o).toBe(solution[i]));
        }
    });
});
