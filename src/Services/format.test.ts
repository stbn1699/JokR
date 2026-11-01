import {describe, expect, it} from "vitest";
import {formatClock, formatDuration} from "./format.ts";

describe("formatDuration", () => {
    it("affiche les secondes seules sous une minute", () => {
        expect(formatDuration(0)).toBe("0 s");
        expect(formatDuration(45_900)).toBe("45 s");
    });

    it("affiche minutes et secondes", () => {
        expect(formatDuration(185_000)).toBe("3 min 05 s");
    });

    it("affiche heures et minutes au-delà d'une heure", () => {
        expect(formatDuration(3_720_000)).toBe("1 h 02 min");
    });
});

describe("formatClock", () => {
    it("affiche mm:ss, puis h:mm:ss", () => {
        expect(formatClock(7_000)).toBe("00:07");
        expect(formatClock(187_000)).toBe("03:07");
        expect(formatClock(3_765_000)).toBe("1:02:45");
    });
});
