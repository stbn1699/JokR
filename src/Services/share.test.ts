import {describe, expect, it} from "vitest";
import {dailyShareText, dailyShareUrl, shareTime} from "./share.ts";

describe("share", () => {
    it("écrit le temps en minutes:secondes", () => {
        expect(shareTime(45_000)).toBe("0:45");
        expect(shareTime(151_000)).toBe("2:31");
        expect(shareTime(3_765_000)).toBe("1:02:45");
    });

    it("compose le message, sans la place (elle change jusqu'à minuit)", () => {
        expect(dailyShareText({gameCode: "QUEENS", gameName: "Queens", durationMs: 151_000}))
            .toBe("J'ai fait 2:31 au Queens du jour ! Viens jouer contre moi sur JokR :");
    });

    it("renvoie vers le défi du jour du jeu", () => {
        expect(dailyShareUrl("queens", "https://jokr.ebasson.fr")).toBe("https://jokr.ebasson.fr/defi/QUEENS");
    });
});
