/*
 * Blackjack en solo contre le croupier (page Hasard). Commun au serveur (la partie) et au site (affichage).
 *
 * Règles :
 * - sabot de BLACKJACK_DECKS jeux de 52 cartes, mélangé à chaque main
 * - le blackjack (as + carte de valeur 10 en deux cartes) paie 3 pour 2 ; une main gagnée paie 1 pour 1 ; égalité : mise rendue
 * - le croupier tire jusqu'à 17 et s'arrête sur tous les 17, même avec un as compté 11
 * - il regarde sa carte cachée quand il montre un as ou une carte de valeur 10 : s'il a blackjack, la main s'arrête tout de suite
 *   (le joueur ne perd que sa mise de départ)
 * - doubler : sur les deux premières cartes de n'importe quelle main (une seule carte de plus, mise doublée)
 * - séparer : deux cartes de même valeur (10, valet, dame et roi valent tous 10), une seule fois ; deux as séparés
 *   reçoivent une carte chacun et s'arrêtent ; 21 après séparation n'est pas un blackjack
 * - pas d'assurance ni d'abandon
 * L'avantage de la maison avec ces règles est d'environ 0,5 % (le joueur récupère ~99,5 % s'il joue parfaitement).
 */

export const BLACKJACK_DECKS = 6;
export const BLACKJACK_BETS = [10, 20, 50, 100, 200, 500] as const;
export const isBlackjackBet = (bet: unknown): bet is number => BLACKJACK_BETS.includes(bet as typeof BLACKJACK_BETS[number]);

export const SUITS = ["coeur", "carreau", "pique", "trefle"] as const;
export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;
export type Suit = typeof SUITS[number];
export type Rank = typeof RANKS[number];
export type Card = { rank: Rank; suit: Suit };

export type HandOutcome = "blackjack" | "win" | "push" | "lose" | "bust";

export type PlayerHand = {
    cards: Card[];
    bet: number;
    doubled: boolean;
    // main issue d'une séparation (21 n'y est pas un blackjack)
    split: boolean;
    // main finie (le joueur reste, a sauté, doublé, ou as séparés)
    done: boolean;
    // à la fin de la partie
    outcome?: HandOutcome;
    payout?: number;
};

export type BlackjackState = {
    // cartes restantes du sabot (la prochaine à la fin)
    shoe: Card[];
    dealer: Card[];
    hands: PlayerHand[];
    // main jouée en ce moment
    active: number;
    finished: boolean;
};

export type BlackjackAction = "hit" | "stand" | "double" | "split";
export const isBlackjackAction = (a: unknown): a is BlackjackAction => a === "hit" || a === "stand" || a === "double" || a === "split";

// ---------- Cartes et valeurs

export function cardValue(card: Card): number {
    if (card.rank === "A") return 11;
    if (card.rank === "J" || card.rank === "Q" || card.rank === "K") return 10;
    return Number(card.rank);
}

// Total d'une main ; soft : un as y compte encore pour 11
export function handTotal(cards: Card[]): { total: number; soft: boolean } {
    let total = 0;
    let aces = 0;
    for (const c of cards) {
        total += cardValue(c);
        if (c.rank === "A") aces++;
    }
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }
    return {total, soft: aces > 0};
}

export const isBlackjack = (cards: Card[]) => cards.length === 2 && handTotal(cards).total === 21;

// Sabot mélangé (random(n) : entier de 0 à n - 1 ; fichier partagé avec le site : le hasard est donné par le serveur)
export function newShoe(random: (n: number) => number, decks = BLACKJACK_DECKS): Card[] {
    const shoe: Card[] = [];
    for (let d = 0; d < decks; d++) for (const suit of SUITS) for (const rank of RANKS) shoe.push({rank, suit});
    for (let i = shoe.length - 1; i > 0; i--) {
        const j = random(i + 1);
        [shoe[i], shoe[j]] = [shoe[j]!, shoe[i]!];
    }
    return shoe;
}

const draw = (state: BlackjackState): Card => {
    const card = state.shoe.pop();
    if (!card) throw new Error("Sabot vide");
    return card;
};

// ---------- Déroulement

/**
 * Nouvelle main : deux cartes au joueur, deux au croupier (la deuxième cachée). Blackjack du joueur, ou du croupier
 * qui montre un as ou une carte de valeur 10 : la main se termine aussitôt.
 */
export function dealBlackjack(bet: number, shoe: Card[]): BlackjackState {
    const state: BlackjackState = {shoe: [...shoe], dealer: [], hands: [{cards: [], bet, doubled: false, split: false, done: false}], active: 0, finished: false};
    const hand = state.hands[0]!;
    hand.cards.push(draw(state));
    state.dealer.push(draw(state));
    hand.cards.push(draw(state));
    state.dealer.push(draw(state));

    const dealerPeeks = cardValue(state.dealer[0]!) >= 10;
    if (isBlackjack(hand.cards) || (dealerPeeks && isBlackjack(state.dealer))) {
        hand.done = true;
        return settle(state, false);
    }
    return state;
}

export function canDouble(state: BlackjackState): boolean {
    const hand = state.hands[state.active];
    return !state.finished && !!hand && !hand.done && hand.cards.length === 2;
}

export function canSplit(state: BlackjackState): boolean {
    const hand = state.hands[state.active];
    return !state.finished && !!hand && state.hands.length === 1 && hand.cards.length === 2
        && cardValue(hand.cards[0]!) === cardValue(hand.cards[1]!);
}

// Mise à ajouter pour une action (doubler ou séparer : la mise de la main), sinon 0
export function actionCost(state: BlackjackState, action: BlackjackAction): number {
    return action === "double" || action === "split" ? state.hands[state.active]!.bet : 0;
}

/**
 * Joue une action sur la main en cours. Renvoie le nouvel état (ou null si l'action n'est pas permise).
 * Quand toutes les mains sont finies, le croupier joue et la partie est réglée.
 */
export function playBlackjack(prev: BlackjackState, action: BlackjackAction): BlackjackState | null {
    if (prev.finished) return null;
    const state: BlackjackState = structuredClone(prev);
    const hand = state.hands[state.active]!;

    if (action === "hit") {
        hand.cards.push(draw(state));
        const {total} = handTotal(hand.cards);
        if (total >= 21) hand.done = true;
    } else if (action === "stand") {
        hand.done = true;
    } else if (action === "double") {
        if (!canDouble(prev)) return null;
        hand.bet *= 2;
        hand.doubled = true;
        hand.cards.push(draw(state));
        hand.done = true;
    } else {
        if (!canSplit(prev)) return null;
        const aces = hand.cards[0]!.rank === "A";
        const second: PlayerHand = {cards: [hand.cards.pop()!], bet: hand.bet, doubled: false, split: true, done: false};
        hand.split = true;
        hand.cards.push(draw(state));
        second.cards.push(draw(state));
        state.hands.push(second);
        // as séparés : une carte chacun, et c'est tout
        if (aces) {
            hand.done = true;
            second.done = true;
        }
        for (const h of state.hands) if (!h.done && handTotal(h.cards).total === 21) h.done = true;
    }

    // main suivante, ou fin de la partie
    while (state.active < state.hands.length && state.hands[state.active]!.done) state.active++;
    if (state.active >= state.hands.length) {
        state.active = state.hands.length - 1;
        return settle(state, true);
    }
    return state;
}

// Le croupier tire jusqu'à 17 (s'arrête sur tous les 17)
function dealerPlays(state: BlackjackState) {
    while (handTotal(state.dealer).total < 17) state.dealer.push(draw(state));
}

// Règle la partie : le croupier joue s'il reste une main en jeu (`play`), puis chaque main est payée
function settle(state: BlackjackState, play: boolean): BlackjackState {
    const dealerBj = isBlackjack(state.dealer);
    const alive = state.hands.some(h => handTotal(h.cards).total <= 21);
    if (play && alive && !dealerBj) dealerPlays(state);
    const dealer = handTotal(state.dealer).total;

    for (const h of state.hands) {
        const total = handTotal(h.cards).total;
        const natural = !h.split && isBlackjack(h.cards);
        let outcome: HandOutcome;
        if (total > 21) outcome = "bust";
        else if (natural && dealerBj) outcome = "push";
        else if (natural) outcome = "blackjack";
        else if (dealerBj) outcome = "lose";
        else if (dealer > 21 || total > dealer) outcome = "win";
        else if (total === dealer) outcome = "push";
        else outcome = "lose";
        h.outcome = outcome;
        h.payout = outcome === "blackjack" ? h.bet + Math.floor(h.bet * 3 / 2)
            : outcome === "win" ? h.bet * 2
                : outcome === "push" ? h.bet : 0;
        h.done = true;
    }
    state.finished = true;
    return state;
}

export const totalBet = (state: BlackjackState) => state.hands.reduce((n, h) => n + h.bet, 0);
export const totalPayout = (state: BlackjackState) => state.hands.reduce((n, h) => n + (h.payout ?? 0), 0);

// ---------- Ce que voit le joueur

export type BlackjackView = {
    // cartes du croupier ; null : carte cachée (tant que la partie n'est pas finie)
    dealer: (Card | null)[];
    dealerTotal: number | null;
    hands: (Omit<PlayerHand, "cards"> & { cards: Card[]; total: number; soft: boolean })[];
    active: number;
    finished: boolean;
    canDouble: boolean;
    canSplit: boolean;
    bet: number;
    payout: number;
};

// État envoyé au site : sans le sabot, et sans la carte cachée du croupier tant que la partie n'est pas finie
export function blackjackView(state: BlackjackState): BlackjackView {
    const dealer = state.finished ? state.dealer : [state.dealer[0]!, null];
    return {
        dealer,
        dealerTotal: state.finished ? handTotal(state.dealer).total : handTotal([state.dealer[0]!]).total,
        hands: state.hands.map(h => ({...h, ...handTotal(h.cards)})),
        active: state.active,
        finished: state.finished,
        canDouble: canDouble(state),
        canSplit: canSplit(state),
        bet: totalBet(state),
        payout: totalPayout(state),
    };
}

// Image d'une carte (public/cards/front/<style>/<couleur>-<valeur>.svg) et du dos (public/cards/back/<style>.svg)
export const DEFAULT_CARD_STYLE = "default";
export const cardImage = (card: Card, style = DEFAULT_CARD_STYLE) => `/cards/front/${style}/${card.suit}-${card.rank}.svg`;
export const cardBackImage = (style = DEFAULT_CARD_STYLE) => `/cards/back/${style}.svg`;
