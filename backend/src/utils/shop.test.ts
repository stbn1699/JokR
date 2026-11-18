import {describe, expect, it} from "vitest";
import {patternBackground, shopItem, SHOP_ITEMS, tierBackgroundLevel} from "./shop.js";

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

    it("vend les fonds animés comme des fonds, à 50 crédits", () => {
        expect(shopItem("anim-pluie")).toEqual({id: "anim-pluie", kind: "background", price: 50});
        expect(Object.keys(SHOP_ITEMS).filter(id => id.startsWith("anim-"))).toHaveLength(5);
        expect(shopItem("anim-inconnu")).toBeUndefined();
    });

    it("vend les effets de victoire, sauf les confettis offerts", () => {
        expect(shopItem("victory-artifice")).toEqual({id: "victory-artifice", kind: "victory-effect", price: 30});
        expect(Object.values(SHOP_ITEMS).filter(i => i.kind === "victory-effect")).toHaveLength(5);
        expect(shopItem("victory-confettis")).toBeUndefined();
    });

    it("vend les motifs et les couleurs, sauf les couleurs offertes", () => {
        expect(shopItem("pattern-rayures")).toEqual({id: "pattern-rayures", kind: "pattern", price: 25});
        expect(shopItem("color-rubis")).toEqual({id: "color-rubis", kind: "pattern-color", price: 5});
        expect(shopItem("color-nuit")).toBeUndefined();
        expect(shopItem("pattern-inconnu")).toBeUndefined();
        // les mêmes motifs que côté site (src/Services/shopCatalog.ts)
        expect(Object.keys(SHOP_ITEMS).filter(id => id.startsWith("pattern-"))).toHaveLength(15);
    });

    it("lit un fond à motif porté et ce qu'il faut posséder", () => {
        expect(patternBackground("pat:pois/rubis/nuit")).toEqual({
            pattern: "pois", colors: ["rubis", "nuit"], needs: ["pattern-pois", "color-rubis"],
        });
        // deux fois la même couleur : achetée une fois
        expect(patternBackground("pat:damier/ciel/ciel")?.needs).toEqual(["pattern-damier", "color-ciel"]);
        expect(patternBackground("pat:pois/nuit/ardoise")?.needs).toEqual(["pattern-pois"]);
        expect(patternBackground("pat:inconnu/nuit/nuit")).toBeUndefined();
        expect(patternBackground("pat:pois/nuit/vert-pomme")).toBeUndefined();
        expect(patternBackground("pat:pois/nuit")).toBeUndefined();
        expect(patternBackground("gradient-aurore")).toBeUndefined();
        // tient dans la colonne du fond porté (varchar 40)
        expect("pat:quadrille/orchidee/emeraude".length).toBeLessThanOrEqual(40);
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
