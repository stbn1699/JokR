import {describe, expect, it} from "vitest";
import {readFileSync} from "node:fs";
import {
    blackjackPlayed,
    dailyClosed,
    dayStreak,
    lotteryDrawn,
    madness,
    parisTime,
    perDay,
    plinkoDrop,
    pokerPlayed,
    rouletteRound,
    type StatCtx,
    streak,
    watchCredits,
    wheelSpun,
} from "./events.js";
import {
    ACHIEVEMENT_PUZZLES,
    achievementMet,
    achievementProgress,
    ACHIEVEMENTS,
    PLINKO_RISK_NAMES,
    POKER_HAND_ACHIEVEMENTS,
    SHOP_CATEGORIES,
    SLOT_MACHINE_NAMES,
} from "../../utils/achievements.js";
import {UPGRADES} from "../../utils/upgrades.js";
import type {BlackjackState, Card} from "../../utils/blackjack.js";
import type {PokerState} from "../../utils/poker.js";
import {WHEEL_SEGMENTS} from "../../utils/wheel.js";

function fakeCtx(now = new Date("2026-03-10T12:00:00Z")) {
    const stats = new Map<string, number>();
    const live = new Set<string>();
    const ctx: StatCtx = {
        now,
        mem: {losses: []},
        get: k => stats.get(k),
        set: (k, v) => void stats.set(k, v),
        add: (k, n = 1) => {
            const v = (stats.get(k) ?? 0) + n;
            stats.set(k, v);
            return v;
        },
        max: (k, v) => {
            if (!stats.has(k) || v > stats.get(k)!) stats.set(k, v);
        },
        min: (k, v) => {
            if (!stats.has(k) || v < stats.get(k)!) stats.set(k, v);
        },
        live: (...p) => p.forEach(x => live.add(x)),
    };
    return {ctx, stats, live};
}

const card = (rank: Card["rank"], suit: Card["suit"] = "coeur"): Card => ({rank, suit});

describe("liste des succès", () => {
    it("a des identifiants uniques et des paliers valides", () => {
        const ids = ACHIEVEMENTS.map(a => a.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ACHIEVEMENTS.length).toBeGreaterThan(500);
        for (const a of ACHIEVEMENTS) {
            expect([1, 2, 3, 4, 5]).toContain(a.tier);
            expect(a.id.length).toBeLessThanOrEqual(64);
            expect(a.stat.length).toBeLessThanOrEqual(96);
        }
    });

    it("compare la statistique selon le sens du succès", () => {
        const top1 = ACHIEVEMENTS.find(a => a.id === "daily-rank-1-QUEENS")!;
        expect(achievementMet(top1, 1)).toBe(true);
        expect(achievementMet(top1, 2)).toBe(false);
        expect(achievementMet(top1, undefined)).toBe(false);
        const exact = ACHIEVEMENTS.find(a => a.id === "balance-777")!;
        expect(achievementMet(exact, 777)).toBe(true);
        expect(achievementMet(exact, 778)).toBe(false);
        const balls = ACHIEVEMENTS.find(a => a.id === "plinko-balls-1000")!;
        expect(achievementProgress(balls, 250)).toBe(0.25);
        expect(achievementProgress(exact, 1)).toBeNull();
    });

    // chaque statistique regardée par un succès doit être écrite quelque part (sinon il ne se débloquerait jamais)
    it("ne regarde que des statistiques tenues par le service", () => {
        const source = ["events.ts", "AchievementsService.ts"].map(f => readFileSync(new URL(f, import.meta.url), "utf8")).join("\n");
        const known = new Set<string>();
        for (const [, key] of source.matchAll(/["`]([a-z][a-zA-Z0-9_.${}-]*)["`]/g)) {
            const k = key!.replace(/\$\{[^}]+}/g, "*");
            known.add(k);
            known.add(`${k}.best`);
        }
        for (const [, game] of source.matchAll(/madness\(ctx, "(\w+)"/g)) known.add(`madness.${game}.best`);
        const dynamic = new Set<string>([
            ...ACHIEVEMENT_PUZZLES.map(g => g.code), ...SLOT_MACHINE_NAMES.map(m => m.id), ...PLINKO_RISK_NAMES.map(r => r.id),
            ...POKER_HAND_ACHIEVEMENTS.map(h => h.hand), ...UPGRADES.map(u => u.id), ...SHOP_CATEGORIES.map(c => c.id),
            "upgrades", "all", "day", "week", "month", "christmas", "newyear", "aprilfools", "friday13", "anniversary",
        ]);
        const missing = ACHIEVEMENTS.map(a => a.stat).filter(stat => {
            if (known.has(stat)) return false;
            const parts = stat.split(".");
            // un morceau variable à la fois (ex. daily.clean.QUEENS.streak.best → daily.clean.*.streak.best)
            return !parts.some((p, i) => dynamic.has(p) && known.has([...parts.slice(0, i), "*", ...parts.slice(i + 1)].join(".")));
        });
        expect([...new Set(missing)]).toEqual([]);
    });
});

describe("outils", () => {
    it("tient une série et son record", () => {
        const {ctx, stats} = fakeCtx();
        streak(ctx, "s", true);
        streak(ctx, "s", true);
        streak(ctx, "s", false);
        streak(ctx, "s", true);
        expect(stats.get("s")).toBe(1);
        expect(stats.get("s.best")).toBe(2);
    });

    it("compte les jours qui se suivent", () => {
        const {ctx, stats} = fakeCtx();
        dayStreak(ctx, "d", 100);
        dayStreak(ctx, "d", 100);
        dayStreak(ctx, "d", 101);
        dayStreak(ctx, "d", 103);
        expect(stats.get("d")).toBe(1);
        expect(stats.get("d.best")).toBe(2);
    });

    it("remet le compteur du jour à zéro le lendemain", () => {
        const {ctx, stats} = fakeCtx();
        perDay(ctx, "p", 300, 1);
        perDay(ctx, "p", 300, 1);
        perDay(ctx, "p", 100, 2);
        expect(stats.get("p")).toBe(100);
        expect(stats.get("p.best")).toBe(600);
    });

    it("la folie : même façon de jouer, perdue à chaque fois", () => {
        const {ctx, stats} = fakeCtx();
        madness(ctx, "x", "a", true);
        madness(ctx, "x", "a", true);
        madness(ctx, "x", "b", true);
        expect(stats.get("madness.x")).toBe(1);
        madness(ctx, "x", "b", true);
        madness(ctx, "x", "b", false);
        expect(stats.get("madness.x")).toBe(0);
        expect(stats.get("madness.x.best")).toBe(2);
    });

    it("lit l'heure de Paris", () => {
        const t = parisTime(new Date("2026-10-09T22:30:00Z"));
        expect([t.month, t.day, t.hour]).toEqual([10, 10, 0]);
    });
});

describe("jeux", () => {
    it("Plinko : bord, mise max, centre et folie", () => {
        const {ctx, stats, live} = fakeCtx();
        plinkoDrop(ctx, {bet: 500, risk: "extreme", slot: 0, multiplier: 41, payout: 20500});
        expect(stats.get("plinko.edge.extreme")).toBe(1);
        expect(stats.get("plinko.edge.maxbet")).toBe(1);
        expect(stats.get("casino.x100")).toBeUndefined();
        for (let i = 0; i < 3; i++) plinkoDrop(ctx, {bet: 10, risk: "medium", slot: 6, multiplier: 0.3, payout: 3});
        expect(stats.get("plinko.center.streak")).toBe(3);
        expect(stats.get("madness.plinko")).toBe(3);
        expect(stats.get("plinko.balls")).toBe(4);
        expect(live.has("credits")).toBe(true);
    });

    it("Roulette : zéro gagnant, plein deux fois de suite, tapis", () => {
        const {ctx, stats} = fakeCtx();
        rouletteRound(ctx, {id: 1, number: 0, bets: [{key: "n:0", amount: 10}], payout: 360});
        expect(stats.get("roulette.zero")).toBe(1);
        expect(stats.get("roulette.sametwice")).toBeUndefined();
        ctx.set("roulette.allin.round", 2);
        rouletteRound(ctx, {id: 2, number: 0, bets: [{key: "n:0", amount: 2000}], payout: 72000});
        expect(stats.get("roulette.sametwice")).toBe(1);
        expect(stats.get("roulette.allin")).toBe(1);
    });

    it("Roulette : obstiné sur le 0 et la même mise perdue", () => {
        const {ctx, stats} = fakeCtx();
        for (let i = 0; i < 5; i++) rouletteRound(ctx, {id: i, number: 7, bets: [{key: "n:0", amount: 10}], payout: 0});
        expect(stats.get("roulette.zeroloss.streak.best")).toBe(5);
        expect(stats.get("madness.roulette.best")).toBe(5);
    });

    it("Poker : casser une quinte flush royale servie", () => {
        const {ctx, stats} = fakeCtx();
        const dealt = [card("10"), card("J"), card("Q"), card("K"), card("A")];
        const final: PokerState = {deck: [], cards: [card("10"), card("J"), card("Q"), card("K"), card("2", "pique")], bet: 10,
            held: [true, true, true, true, false], finished: true, hand: "nothing", payout: 0};
        pokerPlayed(ctx, dealt, final);
        expect(stats.get("poker.inexcusable")).toBe(1);
        expect(stats.get("poker.regret")).toBe(1);
    });

    it("Blackjack : tirer sur 20 et sauter", () => {
        const {ctx, stats} = fakeCtx();
        const before: BlackjackState = {shoe: [], dealer: [card("9"), card("8")], active: 0, finished: false,
            hands: [{cards: [card("K"), card("Q")], bet: 10, doubled: false, split: false, done: false}]};
        const final: BlackjackState = {...before, finished: true,
            hands: [{cards: [card("K"), card("Q"), card("2")], bet: 10, doubled: false, split: false, done: true, outcome: "bust", payout: 0}]};
        blackjackPlayed(ctx, final, before, ["hit"], 10);
        expect(stats.get("bj.greedy")).toBe(1);
        expect(stats.get("bj.22")).toBe(1);
    });

    it("Roue : jackpot et cases vues", () => {
        const {ctx, stats} = fakeCtx();
        const jackpot = WHEEL_SEGMENTS.findIndex(s => s.jackpot);
        wheelSpun(ctx, {segment: jackpot, creditsWon: 1000});
        expect(stats.get("wheel.jackpot")).toBe(1);
        expect(stats.get("wheel.segments")).toBe(1);
        expect(stats.get("earned.total")).toBe(1000);
    });

    it("Loterie : gagner avec un seul ticket, perdre en favori", () => {
        const {ctx, stats} = fakeCtx();
        lotteryDrawn(ctx, {kind: "week", tickets: 50, won: false, prize: 0, most: true, players: 3});
        expect(stats.get("lottery.favorite")).toBe(1);
        expect(stats.get("lottery.tickets.nowin")).toBe(50);
        lotteryDrawn(ctx, {kind: "day", tickets: 1, won: true, prize: 300, most: false, players: 3});
        expect(stats.get("lottery.onewin")).toBe(1);
        expect(stats.get("lottery.tickets.nowin")).toBe(0);
    });

    it("Défis du jour : places finales et Grand Chelem", () => {
        const {ctx, stats} = fakeCtx();
        dailyClosed(ctx, ACHIEVEMENT_PUZZLES.map(g => ({gameCode: g.code, rank: 1, total: 4, durationMs: 1000, firstMs: 1000})));
        expect(stats.get("daily.slam")).toBe(1);
        expect(stats.get("daily.best.QUEENS")).toBe(1);
        dailyClosed(ctx, [{gameCode: "QUEENS", rank: 2, total: 4, durationMs: 1500, firstMs: 1000}]);
        expect(stats.get("daily.soclose")).toBe(1);
        expect(stats.get("daily.best.QUEENS")).toBe(1);
    });

    it("Solde : Phénix et Icare", () => {
        const {ctx, stats} = fakeCtx();
        watchCredits(ctx, 5);
        watchCredits(ctx, 20_000);
        expect(stats.get("phoenix")).toBe(1);
        watchCredits(ctx, 150_000);
        watchCredits(ctx, 3);
        expect(stats.get("icarus")).toBe(1);
    });
});
