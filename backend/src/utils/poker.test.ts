import {describe, expect, it} from "vitest";
import type {Card, Rank, Suit} from "./blackjack.js";
import {dealPoker, drawPoker, evaluatePoker, pokerMiss, pokerResultName, pokerScoringCards, pokerView} from "./poker.js";

// « AS KS » : as de pique, roi de pique… (S pique, H cœur, D carreau, C trèfle)
const SUIT: Record<string, Suit> = {S: "pique", H: "coeur", D: "carreau", C: "trefle"};
const hand = (s: string): Card[] => s.split(" ").map(x => ({rank: x.slice(0, -1) as Rank, suit: SUIT[x.slice(-1)]!}));

describe("poker : combinaisons", () => {
    it.each([
        ["10S JS QS KS AS", "royal"],
        ["9H 10H JH QH KH", "straightFlush"],
        ["AD 2D 3D 4D 5D", "straightFlush"],
        ["7S 7H 7D 7C 2S", "fourKind"],
        ["3S 3H 3D 9C 9S", "fullHouse"],
        ["2H 7H 9H JH KH", "flush"],
        ["5S 6H 7D 8C 9S", "straight"],
        ["AS 2H 3D 4C 5S", "straight"],
        ["10S JH QD KC AS", "straight"],
        ["QS KH AD 2C 3S", "nothing"],
        ["8S 8H 8D KC 2S", "threeKind"],
        ["4S 4H 9D 9C KS", "twoPair"],
        ["JS JH 2D 5C 9S", "jacksOrBetter"],
        ["AS AH 2D 5C 9S", "jacksOrBetter"],
        ["10S 10H 2D 5C 9S", "nothing"],
        ["2S 5H 8D JC KS", "nothing"],
    ])("%s → %s", (cards, expected) => {
        expect(evaluatePoker(hand(cards))).toBe(expected);
    });
});

describe("poker : cartes de la combinaison et mains perdues", () => {
    it("montre les cartes qui comptent", () => {
        expect(pokerScoringCards(hand("JS 2H JD 5C 9S"), "jacksOrBetter")).toEqual([0, 2]);
        expect(pokerScoringCards(hand("4S 4H 9D 9C KS"), "twoPair")).toEqual([0, 1, 2, 3]);
        expect(pokerScoringCards(hand("3S 3H 3D 9C 9S"), "fullHouse")).toEqual([0, 1, 2, 3, 4]);
        expect(pokerScoringCards(hand("5S 6H 7D 8C 9S"), "straight")).toEqual([0, 1, 2, 3, 4]);
        expect(pokerScoringCards(hand("2S 5H 8D JC KS"), "nothing")).toEqual([]);
    });

    it("nomme la paire gagnée", () => {
        expect(pokerResultName(hand("KS 7H KD 2C 9S"), "jacksOrBetter")).toBe("Paire de rois");
        expect(pokerResultName(hand("AS 7H AD 2C 9S"), "jacksOrBetter")).toBe("Paire d'as");
        expect(pokerResultName(hand("3S 3H 3D 9C 9S"), "fullHouse")).toBe("Full");
    });

    it("explique une main perdue", () => {
        expect(pokerMiss(hand("7S 7H 2D 5C 9S"))).toEqual({text: "Paire de 7 : trop petite, il faut au moins une paire de valets", cards: [0, 1]});
        expect(pokerMiss(hand("2S 5H 8D JC KS")).cards).toEqual([]);
    });
});

describe("poker : déroulement", () => {
    it("donne 5 cartes d'un jeu de 52, sans doublon", () => {
        let seed = 9;
        const s = dealPoker(10, n => (seed = (seed * 1103515245 + 12345) % 2 ** 31) % n);
        expect(s.cards).toHaveLength(5);
        expect(s.deck).toHaveLength(47);
        const all = [...s.cards, ...s.deck].map(c => c.rank + c.suit);
        expect(new Set(all).size).toBe(52);
    });

    it("garde les cartes choisies, remplace les autres, et paie la main", () => {
        const s = {deck: hand("2C 3C KD"), cards: hand("KS KH 7D 8C 9S"), bet: 20, held: [false, false, false, false, false], finished: false};
        const done = drawPoker(s, [true, true, false, false, false]);
        expect(done.cards.slice(0, 2)).toEqual(hand("KS KH"));
        expect(done.cards.slice(2).map(c => c.rank)).toEqual(["K", "3", "2"]);
        expect(done.hand).toBe("threeKind");
        expect(done.payout).toBe(60);
        expect(done.finished).toBe(true);
    });

    it("le paquet n'est pas envoyé au joueur", () => {
        const view = pokerView(dealPoker(10, () => 0));
        expect("deck" in view).toBe(false);
    });
});
