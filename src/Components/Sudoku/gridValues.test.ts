import {describe, expect, it} from "vitest";
import {parseGridValues} from "./gridValues.ts";

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
