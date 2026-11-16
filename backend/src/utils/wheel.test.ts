import {describe, expect, it} from "vitest";
import {WHEEL_ORDER, WHEEL_SEGMENTS, WHEEL_TOTAL_WEIGHT, wheelChance, wheelSegmentFor, wheelTickets} from "./wheel.js";
import {wheelAvailable} from "../repository/Wheel.repository.js";

describe("roue du jour", () => {
    it("les chances font 1000 et le jackpot est de 1000 crédits", () => {
        expect(WHEEL_TOTAL_WEIGHT).toBe(1000);
        const jackpot = WHEEL_SEGMENTS.filter(s => s.jackpot);
        expect(jackpot).toHaveLength(1);
        expect(jackpot[0]).toMatchObject({reward: "credits", amount: 1000});
        expect(WHEEL_SEGMENTS.reduce((n, s) => n + wheelChance(s), 0)).toBeCloseTo(100);
    });

    it("tous les types de gains sont sur la roue", () => {
        expect(new Set(WHEEL_SEGMENTS.map(s => s.reward))).toEqual(new Set(["credits", "xp", "respin", "item", "lottery"]));
    });

    it("tickets de loterie : 1 000 par jour de la période", () => {
        const of = (kind: string) => WHEEL_SEGMENTS.find(s => s.lottery === kind)!;
        expect(wheelTickets(of("day"), "2026-11-16")).toBe(1000);
        expect(wheelTickets(of("week"), "2026-11-16")).toBe(7000);
        expect(wheelTickets(of("month"), "2026-11-16")).toBe(30000);
        expect(wheelTickets(of("month"), "2026-12-01")).toBe(31000);
        expect(wheelTickets(of("month"), "2027-02-10")).toBe(28000);
        expect(wheelTickets(of("month"), "2028-02-10")).toBe(29000);
        expect(wheelTickets(WHEEL_SEGMENTS[0]!, "2026-11-16")).toBe(0);
    });

    it("chaque tirage tombe sur une case, autant de fois que son poids", () => {
        const counts = new Array<number>(WHEEL_SEGMENTS.length).fill(0);
        for (let roll = 0; roll < WHEEL_TOTAL_WEIGHT; roll++) counts[wheelSegmentFor(roll)]!++;
        expect(counts).toEqual(WHEEL_SEGMENTS.map(s => s.weight));
    });

    it("chaque case a une place sur la roue, une seule fois", () => {
        expect([...WHEEL_ORDER].sort((a, b) => a - b)).toEqual(WHEEL_SEGMENTS.map((_, i) => i));
    });

    it("bornes : 0 → première case, dernier tirage → dernière case", () => {
        expect(wheelSegmentFor(0)).toBe(0);
        expect(wheelSegmentFor(WHEEL_TOTAL_WEIGHT - 1)).toBe(WHEEL_SEGMENTS.length - 1);
    });
});

describe("roue du jour : lancers disponibles", () => {
    const respin = WHEEL_SEGMENTS.findIndex(s => s.reward === "respin");
    const credits = WHEEL_SEGMENTS.findIndex(s => s.reward === "credits");

    it("un lancer par jour, plus un par relance", () => {
        expect(wheelAvailable([])).toBe(true);
        expect(wheelAvailable([credits])).toBe(false);
        expect(wheelAvailable([respin])).toBe(true);
        expect(wheelAvailable([respin, credits])).toBe(false);
        expect(wheelAvailable([respin, respin])).toBe(true);
        expect(wheelAvailable([respin, respin, credits])).toBe(false);
    });
});
