/*
 * Roulette européenne (un seul zéro, 37 cases) : roue, mises et gains. Fichier partagé : le serveur
 * l'utilise pour vérifier les mises et payer, le site l'importe tel quel (tapis, roue, gains affichés).
 * Pas d'import ici : le fichier doit rester utilisable tel quel des deux côtés.
 *
 * La roulette est en direct : une seule table pour tout le monde, un tour toutes les 30 secondes, jour et nuit.
 * Le tour n vaut de n × 30 s à (n + 1) × 30 s (temps Unix) : 20 s pour miser, puis le serveur tire le numéro,
 * la roue tourne et le résultat reste affiché jusqu'au tour suivant.
 */

export const ROULETTE_ROUND_MS = 30_000;
export const ROULETTE_BETTING_MS = 20_000;

// Tour en cours à un instant (en millisecondes, temps Unix), et ses heures de fermeture des mises et de fin
export const rouletteRoundAt = (time: number) => Math.floor(time / ROULETTE_ROUND_MS);
export const rouletteClosesAt = (round: number) => round * ROULETTE_ROUND_MS + ROULETTE_BETTING_MS;
export const rouletteEndsAt = (round: number) => (round + 1) * ROULETTE_ROUND_MS;
export const rouletteBettingOpen = (round: number, time: number) => time < rouletteClosesAt(round);

// Ordre des cases sur la roue, dans le sens des aiguilles d'une montre en partant du zéro
export const ROULETTE_WHEEL = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export type RouletteColor = "red" | "black" | "green";
export const rouletteColor = (n: number): RouletteColor => (n === 0 ? "green" : RED.has(n) ? "red" : "black");

/*
 * Mises, repérées par une clé :
 * - "n:17" : un numéro (0 à 36), payé 35 fois la mise
 * - "split:17-20" : à cheval sur deux numéros voisins sur le tapis (dont 0-1, 0-2, 0-3), payé 17 fois la mise
 * - "corner:17" : carré de quatre numéros, repéré par le plus petit (17, 18, 20, 21), payé 8 fois la mise
 * - "red" / "black", "even" / "odd", "low" (1-18) / "high" (19-36) : payées 1 fois la mise
 * - "dozen:1" (1-12), "dozen:2" (13-24), "dozen:3" (25-36) : payées 2 fois la mise
 * - "column:1" (1, 4, 7… 34), "column:2" (2, 5… 35), "column:3" (3, 6… 36) : payées 2 fois la mise
 * Le zéro fait perdre toutes les mises sauf celle sur le zéro lui-même.
 */
export type RouletteBet = { key: string; amount: number };

type BetRule = { pays: number; wins: (n: number) => boolean };

const OUTSIDE: Record<string, BetRule> = {
    red: {pays: 1, wins: n => rouletteColor(n) === "red"},
    black: {pays: 1, wins: n => rouletteColor(n) === "black"},
    even: {pays: 1, wins: n => n !== 0 && n % 2 === 0},
    odd: {pays: 1, wins: n => n % 2 === 1},
    low: {pays: 1, wins: n => n >= 1 && n <= 18},
    high: {pays: 1, wins: n => n >= 19},
    "dozen:1": {pays: 2, wins: n => n >= 1 && n <= 12},
    "dozen:2": {pays: 2, wins: n => n >= 13 && n <= 24},
    "dozen:3": {pays: 2, wins: n => n >= 25},
    "column:1": {pays: 2, wins: n => n !== 0 && n % 3 === 1},
    "column:2": {pays: 2, wins: n => n !== 0 && n % 3 === 2},
    "column:3": {pays: 2, wins: n => n !== 0 && n % 3 === 0},
};

/*
 * Voisins sur le tapis : n et n + 3 sont côte à côte (même ligne, colonnes voisines) ; n et n + 1 aussi
 * (même colonne), sauf quand n est en haut de sa colonne (multiple de 3). Le zéro touche 1, 2 et 3.
 */
export function rouletteNeighbors(a: number, b: number): boolean {
    const [lo, hi] = a < b ? [a, b] : [b, a];
    if (lo === 0) return hi >= 1 && hi <= 3;
    if (hi > 36) return false;
    return hi - lo === 3 || (hi - lo === 1 && lo % 3 !== 0);
}

// Numéros d'un carré repéré par son plus petit numéro (undefined si ce carré n'existe pas)
export function rouletteCorner(first: number): number[] | undefined {
    if (first < 1 || first > 32 || first % 3 === 0) return undefined;
    return [first, first + 1, first + 3, first + 4];
}

// Numéros couverts par une mise intérieure (numéro, à cheval, carré) ; undefined pour les autres
export function rouletteNumbers(key: string): number[] | undefined {
    const straight = /^n:(\d{1,2})$/.exec(key);
    if (straight) return Number(straight[1]) <= 36 ? [Number(straight[1])] : undefined;
    const split = /^split:(\d{1,2})-(\d{1,2})$/.exec(key);
    if (split) {
        const a = Number(split[1]);
        const b = Number(split[2]);
        return a < b && rouletteNeighbors(a, b) ? [a, b] : undefined;
    }
    const corner = /^corner:(\d{1,2})$/.exec(key);
    if (corner) return rouletteCorner(Number(corner[1]));
    return undefined;
}

// Règle d'une mise (undefined : clé inconnue)
export function rouletteRule(key: string): BetRule | undefined {
    const numbers = rouletteNumbers(key);
    // 36 / nombre de numéros couverts, moins la mise rendue : 35, 17 ou 8
    if (numbers) return {pays: 36 / numbers.length - 1, wins: n => numbers.includes(n)};
    return Object.hasOwn(OUTSIDE, key) ? OUTSIDE[key] : undefined;
}

// Clés des mises à cheval et en carré (petit numéro d'abord)
export const splitKey = (a: number, b: number) => `split:${Math.min(a, b)}-${Math.max(a, b)}`;
export const cornerKey = (first: number) => `corner:${first}`;

// Jetons proposés ; toute mise est un multiple de 10
export const ROULETTE_CHIPS = [10, 20, 50, 100, 200, 500] as const;
export const ROULETTE_MAX_PER_BET = 2000;
export const ROULETTE_MAX_TOTAL = 10000;
export const ROULETTE_MAX_BETS = 60;

/*
 * Vérifie les jetons envoyés : chacun est un vrai jeton (10, 20, 50…) posé sur une mise connue.
 * Les jetons sont gardés tels quels, un par un (le tapis montre la vraie pile : dix jetons de 10
 * ne ressemblent pas à un jeton de 100) ; les limites portent sur le total de chaque mise.
 * Renvoie les jetons, ou un message d'erreur.
 */
export function parseRouletteBets(raw: unknown): RouletteBet[] | string {
    if (!Array.isArray(raw) || raw.length === 0) return "Pose au moins un jeton";
    if (raw.length > ROULETTE_MAX_BETS) return "Trop de jetons";
    const bets: RouletteBet[] = [];
    for (const item of raw) {
        const {key, amount} = (item ?? {}) as { key?: unknown; amount?: unknown };
        if (typeof key !== "string" || !rouletteRule(key)) return "Mise inconnue";
        if (!ROULETTE_CHIPS.includes(amount as typeof ROULETTE_CHIPS[number])) return "Jeton inconnu";
        bets.push({key, amount: amount as number});
    }
    if ([...rouletteTotals(bets).values()].some(total => total > ROULETTE_MAX_PER_BET)) return `${ROULETTE_MAX_PER_BET} crédits au plus par case`;
    if (rouletteTotal(bets) > ROULETTE_MAX_TOTAL) return `${ROULETTE_MAX_TOTAL} crédits au plus par lancer`;
    return bets;
}

// Total misé sur chaque mise (jetons additionnés)
export function rouletteTotals(bets: RouletteBet[]): Map<string, number> {
    const totals = new Map<string, number>();
    for (const b of bets) totals.set(b.key, (totals.get(b.key) ?? 0) + b.amount);
    return totals;
}

export const rouletteTotal = (bets: RouletteBet[]) => bets.reduce((sum, b) => sum + b.amount, 0);

// Gain total pour un numéro tiré : chaque mise gagnante rapporte sa mise plus mise × cote
export function roulettePayout(bets: RouletteBet[], number: number): number {
    return bets.reduce((sum, b) => {
        const rule = rouletteRule(b.key)!;
        return rule.wins(number) ? sum + b.amount * (rule.pays + 1) : sum;
    }, 0);
}

// Mises gagnantes pour un numéro (pour les surligner sur le tapis)
export const rouletteWinningKeys = (bets: RouletteBet[], number: number) =>
    bets.filter(b => rouletteRule(b.key)!.wins(number)).map(b => b.key);
