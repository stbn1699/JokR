import {describe, expect, it} from "vitest";
import {nextStreak, nextStreakReminder, streakBonus, streakBonusPercent, streakReminderPassed} from "./streak.js";

describe("flamme", () => {
    it("avance d'un jour, ne compte qu'une fois par jour et repart à 1 après un trou", () => {
        expect(nextStreak(0, null, "2026-11-23")).toBe(1);
        expect(nextStreak(4, "2026-11-22", "2026-11-23")).toBe(5);
        expect(nextStreak(4, "2026-11-23", "2026-11-23")).toBe(4);
        expect(nextStreak(4, "2026-11-21", "2026-11-23")).toBe(1);
        expect(nextStreak(9, "2026-02-28", "2026-03-01")).toBe(10);
    });

    it("donne +0,5 % par jour après le premier, jusqu'à +25 %", () => {
        expect(streakBonusPercent(1)).toBe(0);
        expect(streakBonusPercent(2)).toBe(0.5);
        expect(streakBonusPercent(51)).toBe(25);
        expect(streakBonusPercent(400)).toBe(25);
    });

    it("garde les fractions : 200 victoires à 1 crédit et +0,5 % rapportent 1 crédit de plus", () => {
        let carry = 0, total = 0;
        for (let i = 0; i < 200; i++) {
            const r = streakBonus(1, 2, carry);
            carry = r.carry;
            total += r.bonus;
        }
        expect(total).toBe(1);
        expect(carry).toBe(0);
    });

    it("prévoit le rappel à 17 h 30 à Paris, en heure d'hiver comme d'été", () => {
        expect(nextStreakReminder(new Date("2026-11-23T10:00:00Z")).toISOString()).toBe("2026-11-23T16:30:00.000Z");
        expect(nextStreakReminder(new Date("2026-07-01T10:00:00Z")).toISOString()).toBe("2026-07-01T15:30:00.000Z");
        expect(nextStreakReminder(new Date("2026-11-23T16:30:00Z")).toISOString()).toBe("2026-11-24T16:30:00.000Z");
        expect(streakReminderPassed(new Date("2026-11-23T16:29:59Z"))).toBe(false);
        expect(streakReminderPassed(new Date("2026-11-23T16:30:00Z"))).toBe(true);
    });
});
