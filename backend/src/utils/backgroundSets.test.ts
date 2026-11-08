import {describe, expect, it} from "vitest";
import {imageBackground, imageBackgroundSets} from "./backgroundSets.js";
import {shopItem} from "./shop.js";

// Lit les vraies images de public/backgrounds
describe("backgroundSets", () => {
    it("trouve les drapeaux du dossier de la série", () => {
        const lgbt = imageBackgroundSets().find(s => s.set === "lgbt")!;
        const trans = lgbt.backgrounds.find(b => b.id === "bg:lgbt/trans")!;
        expect(trans.name).toBe("Trans");
        expect(trans.file).toBe("/backgrounds/lgbt/trans.svg");
    });

    it("vend les drapeaux comme des fonds", () => {
        const trans = imageBackground("bg:lgbt/trans")!;
        expect(shopItem(trans.id)).toEqual({id: "bg:lgbt/trans", kind: "background", price: trans.price});
        expect(shopItem("bg:../secret")).toBeUndefined();
    });
});
