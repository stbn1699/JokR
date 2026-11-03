import {describe, expect, it} from "vitest";
import {AVATAR_PATTERN, avatarDesign, randomAvatarSeed} from "./avatar.ts";

describe("avatarDesign", () => {
    it("donne toujours la même icône pour la même graine", () => {
        expect(avatarDesign("abc123")).toEqual(avatarDesign("abc123"));
        expect(avatarDesign("abc123")).not.toEqual(avatarDesign("abc124"));
    });

    it("dessine une grille 5×5 symétrique, ni vide ni pleine", () => {
        for (const seed of ["a1b2", "zzzz", "jokr", "0000", "k3p9x2m1q8w7"]) {
            const {cells} = avatarDesign(seed);
            const has = (x: number, y: number) => cells.some(c => c.x === x && c.y === y);
            for (const c of cells) expect(has(4 - c.x, c.y)).toBe(true);
            expect(cells.length).toBeGreaterThanOrEqual(4);
            expect(cells.length).toBeLessThan(25);
        }
    });
});

describe("randomAvatarSeed", () => {
    it("produit une graine valide", () => {
        const seed = randomAvatarSeed();
        expect(seed).toMatch(AVATAR_PATTERN);
        expect(seed).toHaveLength(12);
    });
});
