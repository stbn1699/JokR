import {describe, expect, it} from "vitest";
import {levelTier, xpSteps, xpToNextLevel} from "./leveling.ts";

describe("xpToNextLevel", () => {
    it("utilise la même formule que le backend", () => {
        expect(xpToNextLevel(1)).toBe(100);
        expect(xpToNextLevel(2)).toBe(196);
        expect(xpToNextLevel(100)).toBe(2037);
    });
});

describe("levelTier", () => {
    it("cuivre, argent, or puis diamant (comme les anciennes icônes de niveau)", () => {
        expect(levelTier(0)).toBe("copper");
        expect(levelTier(9)).toBe("copper");
        expect(levelTier(10)).toBe("silver");
        expect(levelTier(24)).toBe("silver");
        expect(levelTier(25)).toBe("gold");
        expect(levelTier(49)).toBe("gold");
        expect(levelTier(50)).toBe("diamond");
        expect(levelTier(120)).toBe("diamond");
    });
});

describe("xpSteps", () => {
    it("une seule étape sans changement de niveau", () => {
        expect(xpSteps(1, 30, 50)).toEqual([{level: 1, from: 30, to: 80, max: 100, levelUp: false}]);
    });

    it("passe au niveau suivant pile au seuil", () => {
        expect(xpSteps(1, 80, 20)).toEqual([
            {level: 1, from: 80, to: 100, max: 100, levelUp: true},
            {level: 2, from: 0, to: 0, max: 196, levelUp: false},
        ]);
    });

    it("enchaîne plusieurs niveaux et garde le surplus (comme le serveur)", () => {
        // 100 (1→2) + 196 (2→3) + 286 (3→4) = 582, il reste 18
        const steps = xpSteps(1, 0, 600);
        expect(steps.map(s => s.level)).toEqual([1, 2, 3, 4]);
        expect(steps.filter(s => s.levelUp)).toHaveLength(3);
        expect(steps.at(-1)).toEqual({level: 4, from: 0, to: 18, max: xpToNextLevel(4), levelUp: false});
    });

    it("renvoie une étape vide pour un gain nul", () => {
        expect(xpSteps(3, 10, 0)).toEqual([{level: 3, from: 10, to: 10, max: 286, levelUp: false}]);
    });
});
