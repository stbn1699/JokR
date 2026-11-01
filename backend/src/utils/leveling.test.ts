import {describe, expect, it} from "vitest";
import {addXp, xpToNextLevel} from "./leveling.js";

describe("xpToNextLevel", () => {
    it("suit la formule ceil(120 × level^1.4)", () => {
        expect(xpToNextLevel(1)).toBe(120);
        expect(xpToNextLevel(2)).toBe(317);
        expect(xpToNextLevel(3)).toBe(559);
    });
});

describe("addXp", () => {
    it("ajoute l'XP sans changer de niveau sous le seuil", () => {
        expect(addXp(1, 0, 119)).toEqual({level: 1, xp: 119});
    });

    it("passe au niveau suivant pile au seuil", () => {
        expect(addXp(1, 0, 120)).toEqual({level: 2, xp: 0});
    });

    it("enchaîne plusieurs niveaux d'un coup", () => {
        // 120 (1→2) + 317 (2→3) + 559 (3→4) = 996, il reste 4
        expect(addXp(1, 0, 1000)).toEqual({level: 4, xp: 4});
    });

    it("tient compte de l'XP déjà accumulée", () => {
        expect(addXp(1, 100, 30)).toEqual({level: 2, xp: 10});
    });

    it("ignore un gain négatif", () => {
        expect(addXp(3, 50, -100)).toEqual({level: 3, xp: 50});
    });
});
