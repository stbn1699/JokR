import {describe, expect, it} from "vitest";
import {
    isPlinkoBet,
    PLINKO_BETS,
    PLINKO_MULTIPLIERS,
    PLINKO_SLOTS,
    plinkoPayout,
    simulatePlinko,
} from "./plinko.js";

// Graines bien réparties, toujours les mêmes (le test ne dépend pas du hasard)
const seeds = (n: number) => Array.from({length: n}, (_, i) => Math.imul(i + 1, 2654435761) >>> 0);

describe("plinko", () => {
    it("une graine donne toujours la même chute (le site rejoue celle du serveur)", () => {
        for (const seed of seeds(50)) {
            const a = simulatePlinko(seed);
            const b = simulatePlinko(seed);
            expect(b.slot).toBe(a.slot);
            expect(b.frames).toEqual(a.frames);
        }
    });

    it("la bille arrive toujours en bas, en quelques secondes, dans une case du plateau", () => {
        for (const seed of seeds(3000)) {
            const drop = simulatePlinko(seed);
            expect(drop.slot).toBeGreaterThanOrEqual(0);
            expect(drop.slot).toBeLessThan(PLINKO_SLOTS);
            // 60 images par seconde : jamais plus de 8 secondes
            expect(drop.frames.length).toBeLessThan(60 * 8);
        }
    });

    it("rend environ 96 % des mises sur la durée, avec des bords rares", () => {
        const n = 20000;
        const counts = new Array<number>(PLINKO_SLOTS).fill(0);
        for (const seed of seeds(n)) counts[simulatePlinko(seed).slot]!++;
        const rtp = counts.reduce((sum, c, slot) => sum + c / n * PLINKO_MULTIPLIERS[slot]!, 0);
        expect(rtp).toBeGreaterThan(0.92);
        expect(rtp).toBeLessThan(0.99);
        // cases du bord (×10) : moins de 1,5 % des chutes chacune
        expect(counts[0]! / n).toBeLessThan(0.015);
        expect(counts[PLINKO_SLOTS - 1]! / n).toBeLessThan(0.015);
    });

    it("les gains tombent juste pour toutes les mises", () => {
        for (const bet of PLINKO_BETS) {
            for (let slot = 0; slot < PLINKO_SLOTS; slot++) {
                const exact = bet * PLINKO_MULTIPLIERS[slot]!;
                expect(Math.abs(plinkoPayout(bet, slot) - exact)).toBeLessThan(1e-9);
            }
        }
        expect(plinkoPayout(100, 0)).toBe(1000);
        expect(plinkoPayout(10, 6)).toBe(3);
    });

    it("n'accepte que les mises prévues", () => {
        expect(isPlinkoBet(10)).toBe(true);
        expect(isPlinkoBet(15)).toBe(false);
        expect(isPlinkoBet("10")).toBe(false);
        expect(isPlinkoBet(-10)).toBe(false);
    });
});
