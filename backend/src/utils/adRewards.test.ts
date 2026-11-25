import {describe, expect, it} from "vitest";
import {AD_MIN_WATCH_MS, AD_REWARDS_PER_DAY, AD_TICKET_TTL_MS, adRewardsLeft, checkAdTicket} from "./adRewards.js";

describe("pubs récompensées", () => {
    it("compte les pubs restantes du jour", () => {
        expect(adRewardsLeft(0)).toBe(AD_REWARDS_PER_DAY);
        expect(adRewardsLeft(AD_REWARDS_PER_DAY - 1)).toBe(1);
        expect(adRewardsLeft(AD_REWARDS_PER_DAY)).toBe(0);
        expect(adRewardsLeft(AD_REWARDS_PER_DAY + 2)).toBe(0);
    });

    it("ne paie un ticket ni trop tôt ni trop tard", () => {
        const start = new Date("2026-11-25T10:00:00Z");
        const at = (ms: number) => new Date(start.getTime() + ms);
        expect(checkAdTicket(start, at(AD_MIN_WATCH_MS - 1))).toBe("too-soon");
        expect(checkAdTicket(start, at(AD_MIN_WATCH_MS))).toBe("ok");
        expect(checkAdTicket(start, at(AD_TICKET_TTL_MS))).toBe("ok");
        expect(checkAdTicket(start, at(AD_TICKET_TTL_MS + 1))).toBe("expired");
    });
});
