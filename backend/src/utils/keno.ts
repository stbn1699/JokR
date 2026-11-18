/*
 * Keno (page Hasard) : le joueur choisit de 1 à 10 numéros entre 1 et 40, puis 10 numéros sont tirés.
 * Jusqu'à 12 puis 15 numéros avec l'amélioration « Numéros cochés » de la boutique (voir upgrades.ts).
 * Le gain dépend du nombre de numéros choisis et du nombre de numéros trouvés (KENO_PAYTABLE, × la mise).
 * Commun au serveur (tirage) et au site (grille, tableau des gains).
 *
 * Chaque tableau rend environ 95 % des mises sur la durée (calcul exact : kenoRtp, vérifié par les tests).
 * Plus on choisit de numéros, plus les gros gains sont rares et gros (jusqu'à ×10 000).
 */

export const KENO_NUMBERS = 40;
export const KENO_DRAWN = 10;
// numéros qu'on peut choisir sans amélioration, et au plus avec
export const KENO_BASE_PICKS = 10;
export const KENO_MAX_PICKS = 15;
export const KENO_BETS = [10, 20, 50, 100, 200, 500] as const;
export const isKenoBet = (bet: unknown): bet is number => KENO_BETS.includes(bet as typeof KENO_BETS[number]);

// Gain (× la mise) selon le nombre de numéros choisis, puis le nombre de numéros trouvés (absent : rien)
export const KENO_PAYTABLE: Record<number, Record<number, number>> = {
    1: {1: 3.8},
    2: {1: 1.5, 2: 6.5},
    3: {2: 3, 3: 45},
    4: {2: 1.5, 3: 9, 4: 120},
    5: {2: 1, 3: 4, 4: 25, 5: 300},
    6: {3: 3, 4: 10, 5: 100, 6: 2500},
    7: {3: 2, 4: 6, 5: 30, 6: 300, 7: 7500},
    8: {3: 1, 4: 5, 5: 15, 6: 85, 7: 1000, 8: 10000},
    9: {4: 3, 5: 13, 6: 55, 7: 500, 8: 5000, 9: 10000},
    10: {4: 2, 5: 7, 6: 30, 7: 200, 8: 1500, 9: 5000, 10: 10000},
    11: {4: 1, 5: 5, 6: 20, 7: 100, 8: 500, 9: 4000, 10: 10000},
    12: {4: 0.5, 5: 3.5, 6: 13, 7: 50, 8: 300, 9: 2000, 10: 10000},
    13: {4: 0.5, 5: 2, 6: 8, 7: 30, 8: 180, 9: 1000, 10: 10000},
    14: {5: 1.5, 6: 6, 7: 22, 8: 100, 9: 800, 10: 10000},
    15: {5: 1, 6: 4, 7: 14, 8: 50, 9: 500, 10: 10000},
};

export const kenoMultiplier = (picks: number, hits: number) => KENO_PAYTABLE[picks]?.[hits] ?? 0;
export const kenoPayout = (bet: number, picks: number, hits: number) => Math.floor(bet * kenoMultiplier(picks, hits));
export const KENO_TOP_MULTIPLIER = Math.max(...Object.values(KENO_PAYTABLE).flatMap(t => Object.values(t)));

// Numéros choisis valides : de 1 à `max` numéros entiers différents entre 1 et KENO_NUMBERS (max : ce que permet
// l'amélioration du joueur)
export function isKenoPicks(picks: unknown, max: number = KENO_BASE_PICKS): picks is number[] {
    return Array.isArray(picks) && picks.length >= 1 && picks.length <= Math.min(max, KENO_MAX_PICKS)
        && picks.every(n => Number.isInteger(n) && n >= 1 && n <= KENO_NUMBERS)
        && new Set(picks).size === picks.length;
}

// Tirage : KENO_DRAWN numéros différents, dans l'ordre de sortie (random(n) : entier de 0 à n - 1 ;
// fichier partagé avec le site : le hasard est donné par le serveur)
export function kenoDraw(random: (n: number) => number): number[] {
    const pool = Array.from({length: KENO_NUMBERS}, (_, i) => i + 1);
    for (let i = 0; i < KENO_DRAWN; i++) {
        const j = i + random(KENO_NUMBERS - i);
        [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    return pool.slice(0, KENO_DRAWN);
}

export const kenoHits = (picks: number[], drawn: number[]) => picks.filter(n => drawn.includes(n)).length;

// Numéros tirés rangés dans un nombre (un bit par numéro : 40 bits, sous la limite des entiers exacts du JS)
export const encodeKenoDraw = (drawn: number[]) => drawn.reduce((mask, n) => mask + 2 ** (n - 1), 0);

// ---------- Probabilités

const comb = (n: number, k: number): number => {
    if (k < 0 || k > n) return 0;
    let r = 1;
    for (let i = 1; i <= k; i++) r = r * (n - k + i) / i;
    return r;
};

// Chance de trouver exactement `hits` numéros en en choisissant `picks`
export const kenoChance = (picks: number, hits: number) =>
    comb(picks, hits) * comb(KENO_NUMBERS - picks, KENO_DRAWN - hits) / comb(KENO_NUMBERS, KENO_DRAWN);

// Part des mises rendue en moyenne pour un nombre de numéros choisis
export const kenoRtp = (picks: number) =>
    Object.entries(KENO_PAYTABLE[picks] ?? {}).reduce((sum, [hits, m]) => sum + kenoChance(picks, Number(hits)) * m, 0);
