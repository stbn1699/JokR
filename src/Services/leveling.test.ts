import {describe, expect, it} from "vitest";
import {levelIconSrc, xpSteps, xpToNextLevel} from "./leveling.ts";

describe("xpToNextLevel", () => {
    it("utilise la même formule que le backend", () => {
        expect(xpToNextLevel(1)).toBe(120);
        expect(xpToNextLevel(2)).toBe(317);
    });
});

describe("levelIconSrc", () => {
    it("pointe vers l'icône du niveau", () => {
        expect(levelIconSrc(12)).toBe("/Icons/level_12.png");
    });

    it("réutilise la dernière icône au-delà du niveau 49", () => {
        expect(levelIconSrc(50)).toBe("/Icons/level_49.png");
        expect(levelIconSrc(120)).toBe("/Icons/level_49.png");
    });
});

describe("xpSteps", () => {
    it("une seule étape sans changement de niveau", () => {
        expect(xpSteps(1, 30, 50)).toEqual([{level: 1, from: 30, to: 80, max: 120, levelUp: false}]);
    });

    it("passe au niveau suivant pile au seuil", () => {
        expect(xpSteps(1, 100, 20)).toEqual([
            {level: 1, from: 100, to: 120, max: 120, levelUp: true},
            {level: 2, from: 0, to: 0, max: 317, levelUp: false},
        ]);
    });

    it("enchaîne plusieurs niveaux et garde le surplus (comme le serveur)", () => {
        // 120 (1→2) + 317 (2→3) + 559 (3→4) = 996, il reste 4
        const steps = xpSteps(1, 0, 1000);
        expect(steps.map(s => s.level)).toEqual([1, 2, 3, 4]);
        expect(steps.filter(s => s.levelUp)).toHaveLength(3);
        expect(steps.at(-1)).toEqual({level: 4, from: 0, to: 4, max: xpToNextLevel(4), levelUp: false});
    });

    it("renvoie une étape vide pour un gain nul", () => {
        expect(xpSteps(3, 10, 0)).toEqual([{level: 3, from: 10, to: 10, max: 559, levelUp: false}]);
    });
});
