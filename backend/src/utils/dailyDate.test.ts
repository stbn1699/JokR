import {describe, expect, it} from "vitest";
import {dailyDate, nextDailyChange, previousDailyDate} from "./dailyDate.js";

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

describe("nextDailyChange", () => {
    it("tombe à minuit heure de Paris (hiver et été)", () => {
        expect(nextDailyChange(new Date("2026-11-01T12:00:00Z")).toISOString()).toBe("2026-11-01T23:00:00.000Z");
        expect(nextDailyChange(new Date("2026-07-15T08:00:00Z")).toISOString()).toBe("2026-07-15T22:00:00.000Z");
    });

    it("reste juste les jours de changement d'heure", () => {
        // Nuit du 28 au 29 mars 2026 : passage à l'heure d'été à 2h ; minuit du 29 au 30 = 22h UTC le 29
        expect(nextDailyChange(new Date("2026-03-29T01:30:00Z")).toISOString()).toBe("2026-03-29T22:00:00.000Z");
        // 25 octobre 2026 : retour à l'heure d'hiver ; minuit du 25 au 26 = 23h UTC le 25
        expect(nextDailyChange(new Date("2026-10-25T00:30:00Z")).toISOString()).toBe("2026-10-25T23:00:00.000Z");
    });

    it("donne le minuit suivant juste après minuit", () => {
        expect(nextDailyChange(new Date("2026-11-01T23:00:00Z")).toISOString()).toBe("2026-11-02T23:00:00.000Z");
    });
});

describe("previousDailyDate", () => {
    it("donne le jour d'avant, y compris en changeant de mois et d'année", () => {
        expect(previousDailyDate("2026-11-05")).toBe("2026-11-04");
        expect(previousDailyDate("2026-03-01")).toBe("2026-02-28");
        expect(previousDailyDate("2027-01-01")).toBe("2026-12-31");
    });
});
