import {describe, expect, it} from "vitest";
import {BOUCLE_LEVELS, GRID_TUTORIAL} from "../../../backend/src/utils/gridLevels.ts";
import {loopLinks, solveBoucleWithGuide} from "./boucleGuide.ts";

// Niveaux de Boucle (backend/src/utils/boucleLevelData.ts), classés avec le guide du tutoriel
const rulesOf = (level: number) => {
    const grid = BOUCLE_LEVELS[level - 1]!;
    return solveBoucleWithGuide(grid, loopLinks(grid.solution, grid.size));
};

describe("niveaux de Boucle", () => {
    it("niveaux 4 à 550 : le guide les résout avec les seules techniques du tutoriel, donc une seule boucle", () => {
        for (let level = GRID_TUTORIAL + 1; level <= 550; level++) {
            const {solved, rules} = rulesOf(level);
            expect(solved).toBe(true);
            expect(rules).not.toContain("trap");
        }
    }, 240_000);

    it("ensuite, le guide les résout encore (en essayant des traits) : une seule boucle", () => {
        for (let level = 551; level <= BOUCLE_LEVELS.length; level += 4) expect(rulesOf(level).solved).toBe(true);
    }, 240_000);
});
