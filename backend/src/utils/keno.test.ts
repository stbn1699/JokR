import {describe, expect, it} from "vitest";
import {
    encodeKenoDraw,
    isKenoPicks,
    KENO_DRAWN,
    KENO_MAX_PICKS,
    KENO_TOP_MULTIPLIER,
    kenoChance,
    kenoDraw,
    kenoHits,
    kenoPayout,
    kenoRtp,
} from "./keno.js";

// générateur reproductible (mulberry32)
function rng(seed: number) {
    let a = seed;
    return (n: number) => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return Math.floor(((t ^ (t >>> 14)) >>> 0) / 4294967296 * n);
    };
}

describe("keno", () => {
    it("chaque tableau rend entre 94 et 96 % des mises", () => {
        for (let picks = 1; picks <= KENO_MAX_PICKS; picks++) {
            expect(kenoRtp(picks)).toBeGreaterThan(0.94);
            expect(kenoRtp(picks)).toBeLessThan(0.96);
        }
        expect(KENO_TOP_MULTIPLIER).toBe(10000);
    });

    it("les chances de chaque tableau font 100 %", () => {
        for (let picks = 1; picks <= KENO_MAX_PICKS; picks++) {
            let sum = 0;
            for (let h = 0; h <= picks; h++) sum += kenoChance(picks, h);
            expect(sum).toBeCloseTo(1, 10);
        }
    });

    it("tirage : 10 numéros différents entre 1 et 40", () => {
        const random = rng(7);
        for (let i = 0; i < 200; i++) {
            const drawn = kenoDraw(random);
            expect(drawn).toHaveLength(KENO_DRAWN);
            expect(new Set(drawn).size).toBe(KENO_DRAWN);
            expect(drawn.every(n => n >= 1 && n <= 40)).toBe(true);
        }
    });

    it("le rendement simulé suit le calcul", () => {
        const random = rng(3);
        const picks = [3, 7, 12, 18, 21, 25, 30, 33, 38, 40];
        let paid = 0;
        const rounds = 200_000;
        for (let i = 0; i < rounds; i++) paid += kenoPayout(10, 5, kenoHits(picks.slice(0, 5), kenoDraw(random)));
        expect(paid / (rounds * 10)).toBeCloseTo(kenoRtp(5), 1);
    });

    it("numéros choisis : 1 à 10, différents, entre 1 et 40", () => {
        expect(isKenoPicks([1])).toBe(true);
        expect(isKenoPicks([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(true);
        expect(isKenoPicks([])).toBe(false);
        expect(isKenoPicks([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])).toBe(false);
        expect(isKenoPicks([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 12)).toBe(true);
        expect(isKenoPicks([...Array(16)].map((_, i) => i + 1), 99)).toBe(false);
        expect(isKenoPicks([1, 1])).toBe(false);
        expect(isKenoPicks([0])).toBe(false);
        expect(isKenoPicks([41])).toBe(false);
        expect(isKenoPicks([2.5])).toBe(false);
        expect(isKenoPicks("1,2")).toBe(false);
    });

    it("gains et enregistrement du tirage", () => {
        expect(kenoPayout(10, 1, 1)).toBe(38);
        expect(kenoPayout(10, 2, 1)).toBe(15);
        expect(kenoPayout(10, 5, 1)).toBe(0);
        expect(encodeKenoDraw([1, 40])).toBe(1 + 2 ** 39);
        expect(Number.isSafeInteger(encodeKenoDraw([31, 32, 33, 34, 35, 36, 37, 38, 39, 40]))).toBe(true);
    });
});
