import {describe, expect, it} from "vitest";
import {
    type BlackjackAction,
    type BlackjackState,
    blackjackView,
    canSplit,
    type Card,
    cardValue,
    dealBlackjack,
    handTotal,
    newShoe,
    playBlackjack,
    type Rank,
    totalBet,
    totalPayout,
} from "./blackjack.js";

const c = (rank: Rank): Card => ({rank, suit: "pique"});
// sabot dont les cartes sortent dans l'ordre donné (joueur, croupier, joueur, croupier, puis la suite)
const shoeOf = (...ranks: Rank[]) => ranks.map(c).reverse();

// générateur reproductible (mulberry32)
function rng(seed: number) {
    let a = seed;
    return (n: number) => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return Math.floor(((t ^ (t >>> 14)) >>> 0) / 4294967296 * n);
    };
}

describe("blackjack : valeurs", () => {
    it("figures à 10, as à 11 ou 1", () => {
        expect(cardValue(c("K"))).toBe(10);
        expect(cardValue(c("10"))).toBe(10);
        expect(handTotal([c("A"), c("6")])).toEqual({total: 17, soft: true});
        expect(handTotal([c("A"), c("6"), c("9")])).toEqual({total: 16, soft: false});
        expect(handTotal([c("A"), c("A"), c("9")])).toEqual({total: 21, soft: true});
    });

    it("sabot de 6 jeux complets, 10 compris", () => {
        const shoe = newShoe(rng(1));
        expect(shoe).toHaveLength(312);
        expect(shoe.filter(x => x.rank === "10")).toHaveLength(24);
    });
});

describe("blackjack : déroulement", () => {
    it("blackjack du joueur : payé 3 pour 2 tout de suite", () => {
        const s = dealBlackjack(100, shoeOf("A", "9", "K", "7"));
        expect(s.finished).toBe(true);
        expect(s.hands[0]!.outcome).toBe("blackjack");
        expect(totalPayout(s)).toBe(250);
    });

    it("blackjack du croupier qui montre un as : le joueur perd sa mise de départ seulement", () => {
        const s = dealBlackjack(100, shoeOf("9", "A", "9", "K"));
        expect(s.finished).toBe(true);
        expect(s.hands[0]!.outcome).toBe("lose");
        expect(totalBet(s)).toBe(100);
    });

    it("le croupier tire jusqu'à 17 et s'arrête sur 17 avec un as", () => {
        let s = dealBlackjack(10, shoeOf("10", "6", "8", "A", "5"))!;
        s = playBlackjack(s, "stand")!;
        expect(s.dealer.map(x => x.rank)).toEqual(["6", "A"]);
        expect(handTotal(s.dealer).total).toBe(17);
        expect(s.hands[0]!.outcome).toBe("win");
        expect(totalPayout(s)).toBe(20);
    });

    it("sauter : perdu sans que le croupier joue", () => {
        let s = dealBlackjack(10, shoeOf("10", "6", "6", "10", "K"));
        s = playBlackjack(s, "hit")!;
        expect(s.finished).toBe(true);
        expect(s.hands[0]!.outcome).toBe("bust");
        expect(s.dealer).toHaveLength(2);
    });

    it("doubler : une carte, mise doublée", () => {
        let s = dealBlackjack(50, shoeOf("6", "9", "5", "7", "10", "10"));
        s = playBlackjack(s, "double")!;
        expect(s.hands[0]!.bet).toBe(100);
        expect(s.hands[0]!.cards).toHaveLength(3);
        expect(handTotal(s.hands[0]!.cards).total).toBe(21);
        expect(s.hands[0]!.outcome).toBe("win");
        expect(totalPayout(s)).toBe(200);
    });

    it("séparer des as : une carte chacun, et 21 n'est pas un blackjack", () => {
        let s: BlackjackState = dealBlackjack(20, shoeOf("A", "9", "A", "8", "K", "Q"));
        expect(canSplit(s)).toBe(true);
        s = playBlackjack(s, "split")!;
        expect(s.finished).toBe(true);
        expect(s.hands.map(h => h.outcome)).toEqual(["win", "win"]);
        expect(totalBet(s)).toBe(40);
        expect(totalPayout(s)).toBe(80);
    });

    it("pas de deuxième séparation, ni de doublement après avoir tiré", () => {
        let s = dealBlackjack(10, shoeOf("8", "9", "8", "7", "8", "2", "3", "4", "5", "6"));
        s = playBlackjack(s, "split")!;
        expect(canSplit(s)).toBe(false);
        s = playBlackjack(s, "hit")!;
        expect(playBlackjack(s, "double")).toBeNull();
    });

    it("la carte cachée du croupier n'est pas envoyée au joueur", () => {
        const s = dealBlackjack(10, shoeOf("10", "6", "8", "Q"));
        const view = blackjackView(s);
        expect(view.dealer).toEqual([c("6"), null]);
        expect(JSON.stringify(view)).not.toContain("shoe");
    });
});

// Stratégie de base (6 jeux, croupier reste sur 17) : le joueur doit récupérer ~99,5 % de ses mises
function basic(s: BlackjackState): BlackjackAction {
    const hand = s.hands[s.active]!;
    const up = cardValue(s.dealer[0]!);
    const {total, soft} = handTotal(hand.cards);
    const two = hand.cards.length === 2;
    if (canSplit(s)) {
        const v = cardValue(hand.cards[0]!);
        if (v === 11 || v === 8) return "split";
        if ((v === 9 && up !== 7 && up < 10) || ((v === 2 || v === 3 || v === 7) && up <= 7) || (v === 6 && up <= 6)) return "split";
    }
    if (soft) {
        if (two && total >= 13 && total <= 18 && up >= 5 && up <= 6) return "double";
        if (total >= 19 || (total === 18 && up <= 8)) return "stand";
        return "hit";
    }
    if (two && (total === 11 || (total === 10 && up <= 9) || (total === 9 && up >= 3 && up <= 6))) return "double";
    if (total >= 17 || (total >= 13 && up <= 6) || (total === 12 && up >= 4 && up <= 6)) return "stand";
    return "hit";
}

describe("blackjack : rendement", () => {
    it("autour de 99 % en jouant bien", () => {
        const random = rng(42);
        let bet = 0, paid = 0;
        for (let i = 0; i < 30_000; i++) {
            let s = dealBlackjack(10, newShoe(random));
            while (!s.finished) s = playBlackjack(s, basic(s)) ?? playBlackjack(s, "hit")!;
            bet += totalBet(s);
            paid += totalPayout(s);
        }
        const rtp = paid / bet;
        expect(rtp).toBeGreaterThan(0.975);
        expect(rtp).toBeLessThan(1.01);
    }, 120_000);
});
