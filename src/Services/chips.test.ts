import {describe, expect, it} from "vitest";
import {chipImage, chipStack} from "./chips.ts";

describe("chips", () => {
    it("décompose une mise en jetons, du plus gros au plus petit", () => {
        expect(chipStack(10)).toEqual([10]);
        expect(chipStack(70)).toEqual([50, 20]);
        expect(chipStack(380)).toEqual([200, 100, 50, 20, 10]);
        expect(chipStack(1000)).toEqual([500, 500]);
        expect(chipStack(0)).toEqual([]);
    });

    it("trouve l'image d'un jeton", () => {
        expect(chipImage(50)).toBe("/chips/default/50.svg");
        expect(chipImage(50, "or")).toBe("/chips/or/50.svg");
    });
});
