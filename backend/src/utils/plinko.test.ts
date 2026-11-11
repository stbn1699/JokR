import {describe, expect, it} from "vitest";
import {
    isPlinkoBet,
    isPlinkoRisk,
    PLINKO_BETS,
    PLINKO_MULTIPLIERS,
    PLINKO_RISKS,
    PLINKO_SLOTS,
    PLINKO_TABLES,
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

    it("rend environ 96 % des mises sur la durée avec chaque tableau, avec des bords rares", () => {
        const n = 20000;
        const counts = new Array<number>(PLINKO_SLOTS).fill(0);
        for (const seed of seeds(n)) counts[simulatePlinko(seed).slot]!++;
        for (const risk of PLINKO_RISKS) {
            const rtp = counts.reduce((sum, c, slot) => sum + c / n * PLINKO_TABLES[risk][slot]!, 0);
            expect(rtp, risk).toBeGreaterThan(0.92);
            expect(rtp, risk).toBeLessThan(0.99);
        }
        // cases du bord : moins de 1,5 % des chutes chacune
        expect(counts[0]! / n).toBeLessThan(0.015);
        expect(counts[PLINKO_SLOTS - 1]! / n).toBeLessThan(0.015);
    });

    it("trois tableaux symétriques, du plus sûr au plus risqué", () => {
        for (const risk of PLINKO_RISKS) {
            const table = PLINKO_TABLES[risk];
            expect(table).toHaveLength(PLINKO_SLOTS);
            expect([...table].reverse()).toEqual([...table]);
        }
        expect(PLINKO_TABLES.low[0]).toBeLessThan(PLINKO_TABLES.medium[0]);
        expect(PLINKO_TABLES.medium[0]).toBeLessThan(PLINKO_TABLES.high[0]);
        expect(PLINKO_TABLES.high[6]).toBe(0.1);
        expect(PLINKO_MULTIPLIERS).toBe(PLINKO_TABLES.medium);
        expect(isPlinkoRisk("high")).toBe(true);
        expect(isPlinkoRisk("extreme")).toBe(false);
    });

    it("les gains tombent juste pour toutes les mises et tous les tableaux", () => {
        for (const risk of PLINKO_RISKS) {
            for (const bet of PLINKO_BETS) {
                for (let slot = 0; slot < PLINKO_SLOTS; slot++) {
                    const exact = bet * PLINKO_TABLES[risk][slot]!;
                    expect(Math.abs(plinkoPayout(bet, slot, risk) - exact)).toBeLessThan(1e-9);
                }
            }
        }
        expect(plinkoPayout(100, 0)).toBe(1000);
        expect(plinkoPayout(10, 6)).toBe(3);
        expect(plinkoPayout(10, 6, "high")).toBe(1);
        expect(plinkoPayout(100, 0, "high")).toBe(2500);
    });

    it("n'accepte que les mises prévues", () => {
        expect(isPlinkoBet(10)).toBe(true);
        expect(isPlinkoBet(15)).toBe(false);
        expect(isPlinkoBet("10")).toBe(false);
        expect(isPlinkoBet(-10)).toBe(false);
    });
});
