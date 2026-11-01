import {describe, expect, it} from "vitest";
import {levelIconSrc, xpToNextLevel} from "./leveling.ts";

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
