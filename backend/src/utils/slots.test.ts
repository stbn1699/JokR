import {describe, expect, it} from "vitest";
import {
    decodeSlotSpin,
    encodeSlotSpin,
    SLOT_LINE_COUNTS,
    SLOT_MACHINES,
    SLOT_REEL_COUNTS,
    slotLineResult,
    slotLines,
    slotMachine,
    slotPaytable,
    slotRtp,
    slotSpin,
} from "./slots.js";

// Générateur pseudo-aléatoire reproductible (mulberry32) pour les simulations des tests
function rng(seed: number) {
    let s = seed >>> 0;
    return (n: number) => {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n);
    };
}

describe("machines à sous", () => {
    it("chaque machine rend environ 96 % des mises, quel que soit le nombre de colonnes", () => {
        for (const m of SLOT_MACHINES) {
            for (const reels of SLOT_REEL_COUNTS) {
                const rtp = slotRtp(m, reels);
                expect(rtp, `${m.id} ${reels}`).toBeGreaterThan(0.95);
                expect(rtp, `${m.id} ${reels}`).toBeLessThan(0.97);
            }
        }
    });

    it("la formule du taux de retour correspond à ce que donnent de vrais lancers", () => {
        const m = slotMachine("classique")!;
        const random = rng(7);
        for (const reels of SLOT_REEL_COUNTS) {
            let bet = 0, paid = 0;
            for (let i = 0; i < 60_000; i++) {
                const stops = Array.from({length: reels}, () => random(m.strip.length));
                paid += slotSpin(m, stops, 100, 10).payout;
                bet += 100;
            }
            expect(Math.abs(paid / bet - slotRtp(m, reels)), `${reels} colonnes`).toBeLessThan(0.04);
        }
    });

    it("les bandes ne contiennent que des symboles de leur machine, 32 au plus", () => {
        for (const m of SLOT_MACHINES) {
            expect(m.strip.length).toBeLessThanOrEqual(32);
            for (const id of m.strip) expect(m.symbols.some(s => s.id === id), `${m.id}:${id}`).toBe(true);
        }
    });

    it("les 10 lignes restent toutes différentes, même sur 3 colonnes", () => {
        for (const reels of SLOT_REEL_COUNTS) {
            const lines = slotLines(reels, 10).map(l => l.join(""));
            expect(new Set(lines).size).toBe(10);
        }
    });

    it("une ligne paie au moins 3 symboles identiques depuis la gauche, le joker remplace les autres", () => {
        const m = slotMachine("classique")!;
        const t = slotPaytable(m, 5);
        expect(slotLineResult(m, t, ["cherry", "cherry", "cherry", "lemon", "cherry"])).toEqual({symbol: "cherry", count: 3, pays: t.cherry![0]});
        expect(slotLineResult(m, t, ["star", "cherry", "star", "cherry", "lemon"]).count).toBe(4);
        expect(slotLineResult(m, t, ["cherry", "cherry", "lemon", "cherry", "cherry"]).pays).toBe(0);
        expect(slotLineResult(m, t, ["star", "star", "star", "star", "star"]).pays).toBe(t.star![0]);
        // 4 et 5 identiques paient plus que 3
        expect(t.seven![2]).toBeGreaterThan(t.seven![1]!);
        expect(t.seven![1]).toBeGreaterThan(t.seven![0]!);
    });

    it("la mise est partagée entre les lignes jouées : moins de lignes, chaque ligne vaut plus", () => {
        const m = slotMachine("classique")!;
        // cerises sur la ligne du milieu
        const stops = [0, 0, 0].map(() => (m.strip.indexOf("cherry") - 1 + m.strip.length) % m.strip.length);
        const one = slotSpin(m, stops, 100, 1);
        const pays = slotPaytable(m, 3).cherry![0]!;
        expect(one.wins.map(w => w.line)).toEqual([0]);
        expect(one.payout).toBe(100 * pays);
        expect(slotSpin(m, stops, 100, 10).payout).toBeLessThan(one.payout);
        for (const lines of SLOT_LINE_COUNTS) expect(slotSpin(m, stops, 100, lines).payout).toBeGreaterThan(0);
    });

    it("un lancer s'enregistre dans un seul nombre (machine, colonnes, lignes, arrêts)", () => {
        for (const stops of [[3, 17, 31], [0, 1, 2, 3], [31, 0, 31, 0, 31]]) {
            const code = encodeSlotSpin(1, 10, stops);
            expect(Number.isSafeInteger(code)).toBe(true);
            expect(decodeSlotSpin(code)).toEqual({machine: 1, reels: stops.length, lines: 10, stops});
        }
    });
});
