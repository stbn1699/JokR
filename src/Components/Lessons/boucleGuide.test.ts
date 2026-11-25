import {describe, expect, it} from "vitest";
import {BOUCLE_LESSONS as GRIDS} from "../../../backend/src/utils/gridLessons.ts";
import {loopLinks, nextBoucleStep, solveBoucleWithGuide} from "./boucleGuide.ts";
import {BOUCLE_SOLUTIONS} from "./boucleLessons.ts";

describe("guide du tutoriel de Boucle", () => {
    it("les solutions du tutoriel sont celles des grilles du serveur", () => {
        GRIDS.forEach((grid, i) => {
            expect(new Set(BOUCLE_SOLUTIONS[i + 1])).toEqual(new Set(loopLinks(grid.solution, grid.size)));
        });
    });

    it("le guide résout chaque leçon jusqu'au bout, sans jamais donner la réponse", () => {
        GRIDS.forEach((grid, i) => {
            const {solved, rules} = solveBoucleWithGuide(grid, BOUCLE_SOLUTIONS[i + 1]!);
            expect(solved).toBe(true);
            expect(rules[0]).toBe("corner");
        });
    });

    it("chaque leçon fait jouer sa technique", () => {
        const rules = GRIDS.map((grid, i) => solveBoucleWithGuide(grid, BOUCLE_SOLUTIONS[i + 1]!).rules);
        expect(rules[0]).toContain("corner");
        expect(rules[1]).toContain("wall");
        expect(rules[2]).toContain("loop");
    });

    it("un trait hors de la boucle est signalé en premier", () => {
        const grid = GRIDS[0]!;
        const solution = BOUCLE_SOLUTIONS[1]!;
        // 0-4 et 1-5 sont voisines mais 1-5 est un mur ; 5-9 est dans la boucle, 4-5 non
        const wrong = 4 * 16 + 5;
        expect(solution).not.toContain(wrong);
        expect(nextBoucleStep(grid, [wrong], solution)?.rule).toBe("wrong");
    });
});
