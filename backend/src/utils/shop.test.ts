import {describe, expect, it} from "vitest";
import {shopItem, SHOP_ITEMS, tierBackgroundLevel} from "./shop.js";

describe("shop", () => {
    it("propose 20 fonds dégradés à 15 crédits", () => {
        const gradients = Object.values(SHOP_ITEMS).filter(i => i.id.startsWith("gradient-"));
        expect(gradients).toHaveLength(20);
        expect(gradients.every(i => i.kind === "background" && i.price === 15)).toBe(true);
    });

    it("ne reconnaît que les objets du catalogue", () => {
        expect(shopItem("gradient-aurore")?.price).toBe(15);
        expect(shopItem("gradient-inconnu")).toBeUndefined();
        expect(shopItem(42)).toBeUndefined();
    });

    it("débloque les fonds des paliers selon le niveau", () => {
        expect(tierBackgroundLevel("tier-stone")).toBe(1);
        expect(tierBackgroundLevel("tier-gold")).toBe(15);
        expect(tierBackgroundLevel("tier-platinum")).toBe(100);
        expect(tierBackgroundLevel("gradient-aurore")).toBeUndefined();
        // pas achetables
        expect(shopItem("tier-gold")).toBeUndefined();
    });
});
