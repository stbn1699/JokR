import {describe, expect, it} from "vitest";
import {WHEEL_SEGMENTS, WHEEL_TOTAL_WEIGHT, wheelChance, wheelSegmentFor} from "./wheel.js";

describe("roue du jour", () => {
    it("les chances font 1000 et le jackpot est de 1000 crédits", () => {
        expect(WHEEL_TOTAL_WEIGHT).toBe(1000);
        const jackpot = WHEEL_SEGMENTS.filter(s => s.jackpot);
        expect(jackpot).toHaveLength(1);
        expect(jackpot[0]).toMatchObject({reward: "credits", amount: 1000});
        expect(WHEEL_SEGMENTS.reduce((n, s) => n + wheelChance(s), 0)).toBeCloseTo(100);
    });

    it("chaque tirage tombe sur une case, autant de fois que son poids", () => {
        const counts = new Array<number>(WHEEL_SEGMENTS.length).fill(0);
        for (let roll = 0; roll < WHEEL_TOTAL_WEIGHT; roll++) counts[wheelSegmentFor(roll)]!++;
        expect(counts).toEqual(WHEEL_SEGMENTS.map(s => s.weight));
    });

    it("bornes : 0 → première case, dernier tirage → dernière case", () => {
        expect(wheelSegmentFor(0)).toBe(0);
        expect(wheelSegmentFor(WHEEL_TOTAL_WEIGHT - 1)).toBe(WHEEL_SEGMENTS.length - 1);
    });
});
