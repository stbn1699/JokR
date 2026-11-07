import {describe, expect, it} from "vitest";
import {dailyRankXp} from "./dailyRankXp.js";

describe("dailyRankXp", () => {
    it("podium : 200, 150 et 100 XP", () => {
        expect(dailyRankXp(1)).toBe(200);
        expect(dailyRankXp(2)).toBe(150);
        expect(dailyRankXp(3)).toBe(100);
    });

    it("du 4e au 50e : un XP de moins par place, 1 XP pour le 50e", () => {
        expect(dailyRankXp(4)).toBe(47);
        expect(dailyRankXp(49)).toBe(2);
        expect(dailyRankXp(50)).toBe(1);
    });

    it("rien au-delà du 50e (ni pour une place invalide)", () => {
        expect(dailyRankXp(51)).toBe(0);
        expect(dailyRankXp(500)).toBe(0);
        expect(dailyRankXp(0)).toBe(0);
    });
});
