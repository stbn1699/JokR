import {describe, expect, it} from "vitest";
import {discountedPrice, MAX_UPGRADES, upgradeItem, upgradeItemId, upgradeLevels, UPGRADES, upgradeValue, upgradeValueFor} from "./upgrades.js";
import {shopItem} from "./shop.js";
import {PLINKO_RISKS} from "./plinko.js";
import {SLOT_LINE_COUNTS, SLOT_REEL_COUNTS} from "./slots.js";
import {KENO_BASE_PICKS, KENO_MAX_PICKS, KENO_PAYTABLE} from "./keno.js";
import {lotteryTickets} from "./lottery.js";
import {wheelAvailable} from "../repository/Wheel.repository.js";
import {WHEEL_SEGMENTS} from "./wheel.js";

describe("améliorations", () => {
    it("des identifiants uniques, des niveaux qui montent et des prix croissants", () => {
        expect(new Set(UPGRADES.map(u => u.id)).size).toBe(UPGRADES.length);
        for (const u of UPGRADES) {
            expect(u.levels.length).toBeGreaterThanOrEqual(2);
            const prices = u.levels.map(l => l.price);
            expect([...prices].sort((a, b) => a - b)).toEqual(prices);
            // le prix du ticket baisse, tout le reste monte
            const values = [u.base.value, ...u.levels.map(l => l.value)];
            const sorted = [...values].sort((a, b) => (u.id === "lottery-ticket" ? b - a : a - b));
            expect(values, u.id).toEqual(sorted);
            expect(new Set(values).size).toBe(values.length);
        }
    });

    it("le niveau d'un joueur : les niveaux possédés à la suite depuis le premier", () => {
        expect(upgradeLevels([])["slots-reels"]).toBe(0);
        expect(upgradeLevels([upgradeItemId("slots-reels", 1)])["slots-reels"]).toBe(1);
        expect(upgradeLevels([upgradeItemId("slots-reels", 1), upgradeItemId("slots-reels", 2)])["slots-reels"]).toBe(2);
        // un niveau 2 sans le 1 ne compte pas
        expect(upgradeLevels([upgradeItemId("slots-reels", 2)])["slots-reels"]).toBe(0);
        expect(upgradeValueFor({}, "slots-reels")).toBe(3);
        expect(upgradeValueFor(MAX_UPGRADES, "slots-reels")).toBe(5);
        expect(upgradeValue("plinko-balls", 99)).toBe(100);
    });

    it("chaque niveau s'achète, après celui d'avant", () => {
        const first = shopItem(upgradeItemId("slots-lines", 1));
        expect(first).toMatchObject({kind: "upgrade", price: 150});
        expect(first?.requires).toBeUndefined();
        expect(shopItem(upgradeItemId("slots-lines", 2))?.requires).toBe(upgradeItemId("slots-lines", 1));
        expect(shopItem(upgradeItemId("slots-lines", 4))).toBeUndefined();
        expect(shopItem("upgrade-inconnue-1")).toBeUndefined();
        expect(upgradeItem(upgradeItemId("keno-picks", 2))).toMatchObject({level: 2, price: 1000});
    });

    it("les valeurs correspondent à ce que permettent les jeux", () => {
        const values = (id: string) => [upgradeValue(id, 0), ...UPGRADES.find(u => u.id === id)!.levels.map(l => l.value)];
        expect(values("slots-reels")).toEqual([...SLOT_REEL_COUNTS]);
        expect(values("slots-lines")).toEqual([...SLOT_LINE_COUNTS]);
        expect(values("plinko-risk").at(-1)).toBe(PLINKO_RISKS.length);
        expect(values("keno-picks")[0]).toBe(KENO_BASE_PICKS);
        expect(values("keno-picks").at(-1)).toBe(KENO_MAX_PICKS);
        for (let picks = 1; picks <= KENO_MAX_PICKS; picks++) expect(KENO_PAYTABLE[picks], `${picks}`).toBeDefined();
    });

    it("remise sur les cosmétiques, prix du ticket, tours de roue", () => {
        const levels = upgradeLevels([upgradeItemId("shop-discount", 1), upgradeItemId("shop-discount", 2)]);
        expect(discountedPrice(100, levels)).toBe(90);
        expect(discountedPrice(5, levels)).toBe(5);
        expect(discountedPrice(1, MAX_UPGRADES)).toBe(1);
        expect(discountedPrice(0, MAX_UPGRADES)).toBe(0);
        expect(discountedPrice(100, {})).toBe(100);

        expect(lotteryTickets(70)).toBe(7);
        expect(lotteryTickets(70, 7)).toBe(10);

        const credits = WHEEL_SEGMENTS.findIndex(s => s.reward === "credits");
        expect(wheelAvailable([credits], 1)).toBe(false);
        expect(wheelAvailable([credits], 2)).toBe(true);
        expect(wheelAvailable([credits, credits], 2)).toBe(false);
    });
});
