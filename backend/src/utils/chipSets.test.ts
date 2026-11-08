import {describe, expect, it} from "vitest";
import {chipSet, chipSets, DEFAULT_CHIP_SET} from "./chipSets.js";
import {shopItem} from "./shop.js";

// Lit les vraies images de public/chips
describe("chipSets", () => {
    it("trouve les jeux de jetons complets, les classiques en premier", () => {
        const sets = chipSets();
        expect(sets[0]!.id).toBe(DEFAULT_CHIP_SET);
        expect(sets[0]!.chips["10"]).toBe("/chips/default/10.svg");
        expect(sets.every(s => Object.keys(s.chips).length === 6)).toBe(true);
    });

    it("offre les jetons classiques et vend les autres", () => {
        expect(chipSet(DEFAULT_CHIP_SET)?.price).toBe(0);
        expect(shopItem(DEFAULT_CHIP_SET)).toBeUndefined();
        const premium = chipSet("chips:premium");
        if (premium) expect(shopItem(premium.id)).toEqual({id: "chips:premium", kind: "chip-set", price: premium.price});
        expect(shopItem("chips:../x")).toBeUndefined();
    });
});
