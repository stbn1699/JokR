/*
 * Poker à 5 cartes en solo (vidéo poker « Jacks or Better », page Hasard). Commun au serveur et au site.
 *
 * - un jeu de 52 cartes mélangé à chaque main ; 5 cartes distribuées
 * - le joueur garde les cartes qu'il veut, les autres sont remplacées une seule fois
 * - la main finale est payée selon sa combinaison (POKER_PAYTABLE, × la mise), à partir d'une paire de valets
 * Avec ce tableau (« 7/5 » : full ×7, couleur ×5), le joueur récupère environ 96 % de ses mises en jouant parfaitement.
 */

import {type Card, newShoe, type Rank} from "./blackjack.js";

export const POKER_BETS = [10, 20, 50, 100, 200, 500] as const;
export const isPokerBet = (bet: unknown): bet is number => POKER_BETS.includes(bet as typeof POKER_BETS[number]);
export const POKER_HAND_SIZE = 5;

export type PokerHand =
    | "royal" | "straightFlush" | "fourKind" | "fullHouse" | "flush" | "straight" | "threeKind" | "twoPair" | "jacksOrBetter" | "nothing";

// Combinaisons payées, de la meilleure à la plus petite
export const POKER_PAYTABLE: { hand: Exclude<PokerHand, "nothing">; name: string; pays: number }[] = [
    {hand: "royal", name: "Quinte flush royale", pays: 800},
    {hand: "straightFlush", name: "Quinte flush", pays: 50},
    {hand: "fourKind", name: "Carré", pays: 25},
    {hand: "fullHouse", name: "Full", pays: 7},
    {hand: "flush", name: "Couleur", pays: 5},
    {hand: "straight", name: "Quinte", pays: 4},
    {hand: "threeKind", name: "Brelan", pays: 3},
    {hand: "twoPair", name: "Double paire", pays: 2},
    {hand: "jacksOrBetter", name: "Paire de valets ou mieux", pays: 1},
];

export const pokerMultiplier = (hand: PokerHand) => POKER_PAYTABLE.find(p => p.hand === hand)?.pays ?? 0;
export const pokerHandName = (hand: PokerHand) => POKER_PAYTABLE.find(p => p.hand === hand)?.name ?? "Rien";

// Valeur d'une carte pour les suites (as haut : 14)
const RANK_VALUE: Record<Rank, number> = {"2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, J: 11, Q: 12, K: 13, A: 14};

// Combinaison de 5 cartes
export function evaluatePoker(cards: Card[]): PokerHand {
    const values = cards.map(c => RANK_VALUE[c.rank]).sort((a, b) => a - b);
    const counts = new Map<number, number>();
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
    const groups = [...counts.values()].sort((a, b) => b - a);
    const flush = cards.every(c => c.suit === cards[0]!.suit);
    const distinct = counts.size === 5;
    // suite : 5 valeurs qui se suivent, ou as-2-3-4-5 (l'as compte alors pour 1)
    const wheel = distinct && values.join() === "2,3,4,5,14";
    const straight = distinct && (values[4]! - values[0]! === 4 || wheel);

    if (straight && flush) return values[0] === 10 ? "royal" : "straightFlush";
    if (groups[0] === 4) return "fourKind";
    if (groups[0] === 3 && groups[1] === 2) return "fullHouse";
    if (flush) return "flush";
    if (straight) return "straight";
    if (groups[0] === 3) return "threeKind";
    if (groups[0] === 2 && groups[1] === 2) return "twoPair";
    if (groups[0] === 2) {
        const pair = [...counts.entries()].find(([, n]) => n === 2)![0];
        if (pair >= 11) return "jacksOrBetter";
    }
    return "nothing";
}

// Cartes qui forment la combinaison (indices dans la main) : toutes pour une quinte, une couleur ou une
// quinte flush ; sinon les cartes des paires, brelans et carrés (pour une paire de valets ou mieux, la paire seule)
export function pokerScoringCards(cards: Card[], hand: PokerHand): number[] {
    if (hand === "nothing") return [];
    if (hand === "royal" || hand === "straightFlush" || hand === "flush" || hand === "straight") return cards.map((_, i) => i);
    const counts = new Map<Rank, number>();
    for (const c of cards) counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1);
    return cards.map((c, i) => counts.get(c.rank)! >= 2 ? i : -1).filter(i => i >= 0);
}

const RANK_NAMES: Record<Rank, string> = {
    "2": "2", "3": "3", "4": "4", "5": "5", "6": "6", "7": "7", "8": "8", "9": "9", "10": "10",
    J: "valets", Q: "dames", K: "rois", A: "as",
};

// Nom de la main gagnée, précis pour une paire (« Paire de rois ») ; sinon celui du tableau des gains
export function pokerResultName(cards: Card[], hand: PokerHand): string {
    if (hand !== "jacksOrBetter") return pokerHandName(hand);
    const pair = cards[pokerScoringCards(cards, hand)[0]!]!.rank;
    return `Paire ${pair === "A" ? "d'" : "de "}${RANK_NAMES[pair]}`;
}

// Main sans gain : pourquoi (une paire trop petite, ou rien du tout), et ses cartes à montrer
export function pokerMiss(cards: Card[]): { text: string; cards: number[] } {
    const counts = new Map<Rank, number>();
    for (const c of cards) counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1);
    const pair = [...counts.entries()].find(([, n]) => n === 2)?.[0];
    if (pair) {
        return {
            text: `Paire de ${RANK_NAMES[pair]} : trop petite, il faut au moins une paire de valets`,
            cards: cards.map((c, i) => c.rank === pair ? i : -1).filter(i => i >= 0),
        };
    }
    return {text: "Aucune combinaison : il fallait au moins une paire de valets", cards: []};
}

// ---------- Déroulement

export type PokerState = {
    // cartes restantes du paquet (la prochaine à la fin)
    deck: Card[];
    cards: Card[];
    bet: number;
    // cartes gardées au tirage
    held: boolean[];
    finished: boolean;
    hand?: PokerHand;
    payout?: number;
};

// Donne : 5 cartes d'un jeu de 52 mélangé (random(n) : entier de 0 à n - 1, donné par le serveur)
export function dealPoker(bet: number, random: (n: number) => number): PokerState {
    const deck = newShoe(random, 1);
    const cards = deck.splice(-POKER_HAND_SIZE).reverse();
    return {deck, cards, bet, held: cards.map(() => false), finished: false};
}

export const isPokerHolds = (held: unknown): held is boolean[] =>
    Array.isArray(held) && held.length === POKER_HAND_SIZE && held.every(h => typeof h === "boolean");

// Tirage : les cartes non gardées sont remplacées, puis la main est payée
export function drawPoker(prev: PokerState, held: boolean[]): PokerState {
    const state: PokerState = structuredClone(prev);
    state.held = [...held];
    state.cards = state.cards.map((c, i) => held[i] ? c : state.deck.pop()!);
    state.hand = evaluatePoker(state.cards);
    state.payout = state.bet * pokerMultiplier(state.hand);
    state.finished = true;
    return state;
}

// Ce que voit le joueur : sans le paquet
export type PokerView = Omit<PokerState, "deck">;
export function pokerView(state: PokerState): PokerView {
    const view: Partial<PokerState> = {...state};
    delete view.deck;
    return view as PokerView;
}
