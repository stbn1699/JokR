import {describe, expect, it} from "vitest";
import {DEFAULT_BALL, plinkoBall, plinkoBallSets} from "./plinkoBalls.js";
import {shopItem} from "./shop.js";

// Lit les vraies images de public/plinko_ball
describe("plinkoBalls", () => {
    it("trouve les séries de billes et leurs couleurs, dans l'ordre des numéros", () => {
        const sets = plinkoBallSets();
        const rainbow = sets.find(s => s.set === "rainbow")!;
        expect(rainbow.name).toBe("Arc-en-ciel");
        expect(rainbow.balls[0]!.id).toBe("ball:rainbow/1_red");
        expect(rainbow.balls[0]!.name).toBe("Rouge");
        expect(rainbow.balls.every(b => b.file.startsWith("/plinko_ball/rainbow/"))).toBe(true);
    });

    it("offre la bille par défaut et vend les autres", () => {
        expect(plinkoBall(DEFAULT_BALL)?.price).toBe(0);
        expect(shopItem(DEFAULT_BALL)).toBeUndefined();
        expect(shopItem("ball:rainbow/1_red")).toEqual({id: "ball:rainbow/1_red", kind: "plinko-ball", price: 10});
        expect(shopItem("ball:../secret")).toBeUndefined();
    });
});
