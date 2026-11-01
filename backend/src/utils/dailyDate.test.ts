import {describe, expect, it} from "vitest";
import {dailyDate} from "./dailyDate.js";

describe("dailyDate", () => {
    it("renvoie la date au format AAAA-MM-JJ", () => {
        expect(dailyDate(new Date("2026-11-01T12:00:00Z"))).toBe("2026-11-01");
    });

    it("change de jour à minuit heure de Paris, pas à minuit UTC", () => {
        // 23h30 UTC le 1er novembre = 0h30 le 2 novembre à Paris (heure d'hiver, UTC+1)
        expect(dailyDate(new Date("2026-11-01T23:30:00Z"))).toBe("2026-11-02");
        // 22h30 UTC le 15 juillet = 0h30 le 16 juillet à Paris (heure d'été, UTC+2)
        expect(dailyDate(new Date("2026-07-15T22:30:00Z"))).toBe("2026-07-16");
        expect(dailyDate(new Date("2026-07-15T21:30:00Z"))).toBe("2026-07-15");
    });
});
