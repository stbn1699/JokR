import {describe, expect, it} from "vitest";
import {lastLotteryDraw, lotteryDrawDate, lotteryPeriod, lotteryPrize, lotteryTickets, nextLotteryDraw, pickLotteryWinner} from "./lottery.js";

// Heure de Paris → instant (pour lire les tests) : hiver UTC+1, été UTC+2
const paris = (iso: string, offset: number) => Date.parse(`${iso}${offset === 1 ? "+01:00" : "+02:00"}`);
const show = (t: number) => new Date(t).toISOString();

describe("loteries : dates des tirages (23 h 59, heure de Paris)", () => {
    it("du jour : ce soir, ou demain soir après 23 h 59", () => {
        expect(show(nextLotteryDraw("day", paris("2026-11-12T10:00", 1)))).toBe(show(paris("2026-11-12T23:59", 1)));
        expect(show(nextLotteryDraw("day", paris("2026-11-12T23:59:30", 1)))).toBe(show(paris("2026-11-13T23:59", 1)));
    });

    it("de la semaine : le dimanche", () => {
        // jeudi 12 novembre 2026 → dimanche 15
        expect(show(nextLotteryDraw("week", paris("2026-11-12T10:00", 1)))).toBe(show(paris("2026-11-15T23:59", 1)));
        // dimanche après le tirage → dimanche suivant
        expect(show(nextLotteryDraw("week", paris("2026-11-15T23:59:30", 1)))).toBe(show(paris("2026-11-22T23:59", 1)));
    });

    it("du mois : le dernier jour (28, 29, 30 ou 31)", () => {
        expect(show(nextLotteryDraw("month", paris("2026-11-12T10:00", 1)))).toBe(show(paris("2026-11-30T23:59", 1)));
        expect(show(nextLotteryDraw("month", paris("2027-02-03T10:00", 1)))).toBe(show(paris("2027-02-28T23:59", 1)));
        expect(show(nextLotteryDraw("month", paris("2028-02-03T10:00", 1)))).toBe(show(paris("2028-02-29T23:59", 1)));
        expect(show(nextLotteryDraw("month", paris("2026-12-31T23:59:30", 1)))).toBe(show(paris("2027-01-31T23:59", 1)));
    });

    it("tient compte du changement d'heure", () => {
        // été (UTC+2) : 23 h 59 à Paris = 21 h 59 UTC
        expect(show(nextLotteryDraw("day", paris("2026-07-01T12:00", 2)))).toBe(show(paris("2026-07-01T23:59", 2)));
        // jour du passage à l'heure d'hiver (25 octobre 2026)
        expect(show(nextLotteryDraw("day", paris("2026-10-25T12:00", 1)))).toBe(show(paris("2026-10-25T23:59", 1)));
    });

    it("période : du tirage précédent au tirage", () => {
        const draw = paris("2026-11-15T23:59", 1);
        expect(lotteryPeriod("week", draw)).toEqual({start: paris("2026-11-08T23:59", 1), end: draw});
        expect(lotteryPeriod("month", paris("2026-03-31T23:59", 2)).start).toBe(paris("2026-02-28T23:59", 1));
        expect(lastLotteryDraw("day", paris("2026-11-12T10:00", 1))).toBe(paris("2026-11-11T23:59", 1));
        expect(lotteryDrawDate(draw)).toBe("2026-11-15");
    });
});

describe("loteries : tickets, cagnotte et tirage", () => {
    it("un ticket par tranche de 10 crédits misés, 5 % des mises pour le gagnant", () => {
        expect(lotteryTickets(9)).toBe(0);
        expect(lotteryTickets(25)).toBe(2);
        expect(lotteryPrize("day", 1999)).toBe(99);
    });

    it("tire un ticket : chacun gagne selon ses tickets", () => {
        const players = [{id: "a", tickets: 1}, {id: "b", tickets: 3}];
        expect(pickLotteryWinner(players, () => 0)?.id).toBe("a");
        expect(pickLotteryWinner(players, () => 1)?.id).toBe("b");
        expect(pickLotteryWinner(players, () => 3)?.id).toBe("b");
        expect(pickLotteryWinner([{id: "c", tickets: 0}], () => 0)).toBeNull();
    });
});
