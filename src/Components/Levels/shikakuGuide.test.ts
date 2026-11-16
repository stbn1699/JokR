import {describe, expect, it} from "vitest";
import {SHIKAKU_LEVELS, SHIKAKU_TUTORIAL} from "../../../backend/src/utils/shikakuLevels.ts";
import {generateShikaku, solveShikaku} from "../../../backend/src/utils/shikaku.ts";
import {planShikaku, shikakuRectCells} from "./shikakuGuide.ts";

const [lesson1, lesson2, lesson3] = SHIKAKU_LEVELS;
const owners = (p: typeof lesson1) => {
    const owner = Array<number>(p!.width * p!.height).fill(-1);
    for (const s of planShikaku(p!).steps) if (s.kind === "draw") for (const k of shikakuRectCells(s.rect, p!.width)) owner[k] = s.clue;
    return owner;
};

describe("guide du tutoriel du Shikaku", () => {
    it("3 leçons, que le guide découpe entièrement, comme la solution", () => {
        expect(SHIKAKU_TUTORIAL).toBe(3);
        for (const lesson of SHIKAKU_LEVELS.slice(0, SHIKAKU_TUTORIAL)) {
            expect(planShikaku(lesson).solved).toBe(true);
            expect(owners(lesson)).toEqual(solveShikaku(lesson, 2).solution);
        }
    });

    it("leçon 1 : chaque nombre n'a qu'une place, sans autre technique", () => {
        expect(planShikaku(lesson1!, []).solved).toBe(true);
    });

    it("leçon 2 : commence par une case orpheline, et en a besoin", () => {
        expect(planShikaku(lesson2!, []).solved).toBe(false);
        expect(planShikaku(lesson2!, ["cell"]).solved).toBe(true);
        expect(planShikaku(lesson2!).steps[0]).toMatchObject({kind: "reserve", why: "cell"});
    });

    it("leçon 3 : a besoin des cases sûres", () => {
        expect(planShikaku(lesson3!, ["cell"]).solved).toBe(false);
        expect(planShikaku(lesson3!).steps.some(s => s.kind === "reserve" && s.why === "common")).toBe(true);
    });

    it("ne se trompe jamais : sur des grilles au hasard, les rectangles tracés sont ceux de la solution", () => {
        for (let k = 0; k < 30; k++) {
            const {puzzle} = generateShikaku(6, 6, 0, 8);
            const solution = solveShikaku(puzzle, 2).solution!;
            owners(puzzle).forEach((o, i) => o >= 0 && expect(o).toBe(solution[i]));
        }
    });
});
