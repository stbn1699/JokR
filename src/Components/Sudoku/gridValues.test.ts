import {describe, expect, it} from "vitest";
import {countDigits, parseGridValues} from "./gridValues.ts";

const full = Array.from({length: 81}, (_, i) => String((i % 9) + 1));

describe("parseGridValues", () => {
    it("convertit 81 chiffres en grille 9×9", () => {
        const grid = parseGridValues(full);
        expect(grid).toHaveLength(9);
        expect(grid?.[0]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        expect(grid?.[8]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it("refuse une case vide", () => {
        const values = [...full];
        values[40] = "";
        expect(parseGridValues(values)).toBeNull();
    });

    it("refuse 0, 10 ou du texte", () => {
        for (const bad of ["0", "10", "a", "1.5"]) {
            const values = [...full];
            values[0] = bad;
            expect(parseGridValues(values)).toBeNull();
        }
    });

    it("refuse un nombre de cases différent de 81", () => {
        expect(parseGridValues(full.slice(1))).toBeNull();
    });
});

describe("countDigits", () => {
    it("compte chaque chiffre et ignore les cases vides", () => {
        const counts = countDigits(["2", "", "2", "9", "", "2"]);
        expect(counts[2]).toBe(3);
        expect(counts[9]).toBe(1);
        expect(counts[5]).toBe(0);
    });

    it("donne 9 partout pour une grille complète", () => {
        expect(countDigits(full).slice(1)).toEqual(Array(9).fill(9));
    });

    it("ignore ce qui n'est pas un chiffre de 1 à 9", () => {
        expect(countDigits(["0", "10", "a"]).reduce((a, b) => a + b, 0)).toBe(0);
    });
});
