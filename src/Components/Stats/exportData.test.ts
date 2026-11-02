import {describe, expect, it} from "vitest";
import {toCsv} from "./exportData.ts";

describe("toCsv", () => {
    it("écrit l'en-tête puis une ligne par objet", () => {
        expect(toCsv([{a: 1, b: "x"}, {a: 2, b: null}])).toBe("\u{FEFF}a;b\r\n1;x\r\n2;");
    });

    it("protège les séparateurs et les guillemets", () => {
        expect(toCsv([{t: 'un;deux "trois"'}])).toBe('\u{FEFF}t\r\n"un;deux ""trois"""');
    });

    it("renvoie une chaîne vide sans ligne", () => {
        expect(toCsv([])).toBe("");
    });
});
