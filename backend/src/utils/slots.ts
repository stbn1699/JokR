/*
 * Machines à sous du Hasard : un seul moteur, plusieurs machines (une fiche chacune : thème, symboles, bande des
 * rouleaux, gains de base). Fichier partagé avec le site (il dessine les rouleaux, les lignes et la table des gains).
 *
 * Le joueur choisit :
 * - le nombre de colonnes (3, 4 ou 5 rouleaux), sur 3 lignes visibles
 * - le nombre de lignes de gain (1, 3, 5 ou 10 tracés, toujours les premiers de SLOT_PATTERNS) : la mise est
 *   partagée entre elles. Moins de lignes = chaque ligne vaut plus cher : gains plus rares mais plus gros.
 *   En moyenne, toutes les combinaisons rendent pareil (chaque ligne rend la même part de sa mise).
 * Une ligne gagne avec au moins 3 symboles identiques en partant de la gauche (4 ou 5 paient plus). Le joker
 * remplace n'importe quel symbole ; une ligne entière de jokers paie le gain du joker.
 * Pour chaque nombre de colonnes, la table des gains est calculée pour rendre environ 96 % des mises
 * (formule exacte, vérifiée par les tests) ; la volatilité change d'une machine à l'autre.
 */

export const SLOT_ROWS = 3;
export const SLOT_REEL_COUNTS = [3, 4, 5] as const;
export const SLOT_LINE_COUNTS = [1, 3, 5, 10] as const;
export const isSlotReelCount = (v: unknown): v is number => (SLOT_REEL_COUNTS as readonly unknown[]).includes(v);
export const isSlotLineCount = (v: unknown): v is number => (SLOT_LINE_COUNTS as readonly unknown[]).includes(v);

// Taux de retour visé (part des mises rendue en moyenne)
export const SLOT_RTP = 0.96;

// Tracés des lignes de gain, du plus simple au plus tordu : pour chaque rouleau, la ligne (0 en haut) lue.
// Avec moins de 5 colonnes, on garde le début de chaque tracé (les 10 restent tous différents).
export const SLOT_PATTERNS: readonly (readonly number[])[] = [
    [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
    [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [1, 0, 1, 2, 1],
];

// Lignes jouées : les `lines` premiers tracés, coupés à `reels` colonnes
export const slotLines = (reels: number, lines: number) => SLOT_PATTERNS.slice(0, lines).map(p => p.slice(0, reels));

// Mises possibles (comme le Plinko)
export const SLOT_BETS = [10, 20, 50, 100, 200, 500] as const;
export const isSlotBet = (v: unknown): v is number => typeof v === "number" && (SLOT_BETS as readonly number[]).includes(v);

export type SlotSymbol = {
    id: string;
    name: string;
    // image du symbole (chemin dans public/)
    image: string;
    // poids du symbole dans la table des gains (3 identiques sur 3 colonnes ≈ ce gain)
    base: number;
    wild?: boolean;
};

export type SlotMachine = {
    id: string;
    name: string;
    tagline: string;
    // icône de la machine dans la liste (public/)
    icon: string;
    volatility: "faible" | "moyenne" | "forte";
    symbols: SlotSymbol[];
    // bande de chaque rouleau (la même pour tous), lue de haut en bas : 32 symboles au plus
    strip: string[];
};

// Bande d'un rouleau à partir du nombre de chaque symbole, répartis pour ne pas les regrouper
function strip(counts: [string, number][]): string[] {
    const keyed = counts.flatMap(([id, n], i) => Array.from({length: n}, (_, k) => ({id, at: (k + 0.5) / n + i / 1000})));
    return keyed.sort((a, b) => a.at - b.at).map(x => x.id);
}

export const SLOT_MACHINES: SlotMachine[] = [
    {
        id: "classique",
        name: "Classique",
        tagline: "Fruits, cloches et 7 : souvent un petit gain",
        icon: "/slots/classique/seven.svg",
        volatility: "faible",
        symbols: [
            {id: "cherry", name: "Cerises", image: "/slots/classique/cherry.svg", base: 5},
            {id: "lemon", name: "Citron", image: "/slots/classique/lemon.svg", base: 8},
            {id: "grape", name: "Raisin", image: "/slots/classique/grape.svg", base: 15},
            {id: "bell", name: "Cloche", image: "/slots/classique/bell.svg", base: 32},
            {id: "bar", name: "BAR", image: "/slots/classique/bar.svg", base: 60},
            {id: "seven", name: "Sept", image: "/slots/classique/seven.svg", base: 100},
            {id: "star", name: "Étoile (joker)", image: "/slots/classique/star.svg", base: 250, wild: true},
        ],
        strip: strip([["cherry", 6], ["lemon", 5], ["grape", 3], ["bell", 2], ["bar", 1], ["seven", 1], ["star", 1]]),
    },
    {
        id: "jokr",
        name: "JokR",
        tagline: "Les puzzles du site : rares mais gros gains",
        icon: "/favicon.svg",
        volatility: "forte",
        symbols: [
            {id: "sudoku", name: "Sudoku", image: "/gameIcons/SUDOKU.svg", base: 3},
            {id: "queens", name: "Queens", image: "/gameIcons/QUEENS.svg", base: 6},
            {id: "rikudo", name: "Rikudo", image: "/gameIcons/RIKUDO.svg", base: 12},
            {id: "galaxies", name: "Galaxies", image: "/gameIcons/GALAXIES.svg", base: 26},
            {id: "r", name: "Le R", image: "/slots/jokr/R.svg", base: 100},
            {id: "logo", name: "JokR", image: "/JokR_Logo_Full.svg", base: 200},
            {id: "joker", name: "Icône JokR (joker)", image: "/favicon.svg", base: 300, wild: true},
        ],
        strip: strip([["sudoku", 6], ["queens", 4], ["rikudo", 3], ["galaxies", 2], ["r", 1], ["logo", 1], ["joker", 1]]),
    },
];

export const slotMachine = (id: unknown): SlotMachine | undefined => SLOT_MACHINES.find(m => m.id === id);

// Combien de fois plus paient 4 et 5 symboles identiques que 3 (avant mise à l'échelle)
const LENGTH_WEIGHT = [1, 4, 15];

/*
 * Chances qu'une ligne paie chaque symbole sur k cases, pour un nombre de colonnes : les rouleaux sont
 * indépendants et chaque case d'une ligne vient d'un rouleau différent, donc tout se calcule avec la fréquence
 * des symboles sur la bande. Une ligne paie le premier symbole non joker, sur toutes les cases de gauche qui sont
 * ce symbole ou un joker ; que des jokers : le joker, sur toute la ligne.
 */
function lineOdds(machine: SlotMachine, reels: number) {
    const n = machine.strip.length;
    const wild = machine.symbols.find(s => s.wild);
    const pWild = wild ? machine.strip.filter(id => id === wild.id).length / n : 0;
    const odds: { symbol: SlotSymbol; k: number; p: number }[] = [];
    for (const s of machine.symbols) {
        if (s.wild) continue;
        const pSorW = machine.strip.filter(id => id === s.id).length / n + pWild;
        for (let k = 3; k <= reels; k++) {
            // k premières cases en {symbole, joker} avec au moins un symbole, puis une case qui casse la suite
            const run = pSorW ** k - pWild ** k;
            odds.push({symbol: s, k, p: run * (k < reels ? 1 - pSorW : 1)});
        }
    }
    if (wild) odds.push({symbol: wild, k: reels, p: pWild ** reels});
    return odds;
}

// Gains arrondis : au demi en dessous de 10 (×2,5), à l'unité au-dessus ; ×1 au moins
const roundPays = (x: number) => Math.max(1, x < 10 ? Math.round(x * 2) / 2 : Math.round(x));

// Table des gains pour un nombre de colonnes : gains[symbole][k - 3] = gain de k identiques, en fois la mise d'une ligne
const tables = new Map<string, Record<string, number[]>>();
export function slotPaytable(machine: SlotMachine, reels: number): Record<string, number[]> {
    const key = `${machine.id}:${reels}`;
    const cached = tables.get(key);
    if (cached) return cached;
    const weight = (s: SlotSymbol, k: number) => s.base * (s.wild ? LENGTH_WEIGHT[reels - 3]! : LENGTH_WEIGHT[k - 3]!);
    const odds = lineOdds(machine, reels);
    const scale = SLOT_RTP / odds.reduce((sum, o) => sum + o.p * weight(o.symbol, o.k), 0);
    const table: Record<string, number[]> = {};
    for (const s of machine.symbols) {
        table[s.id] = s.wild
            ? [roundPays(weight(s, reels) * scale)]
            : Array.from({length: reels - 2}, (_, i) => roundPays(weight(s, i + 3) * scale));
    }
    tables.set(key, table);
    return table;
}

// Plus gros gain d'une ligne sur une machine (5 colonnes, ligne entière de jokers)
export const slotTopPays = (machine: SlotMachine) => Math.max(...Object.values(slotPaytable(machine, 5)).flat());

// Gain d'un joker (ligne entière) dans la table
export const wildPays = (table: Record<string, number[]>, id: string) => table[id]![0]!;

// Taux de retour exact d'une machine pour un nombre de colonnes (la même pour tout nombre de lignes)
export function slotRtp(machine: SlotMachine, reels: number): number {
    const table = slotPaytable(machine, reels);
    return lineOdds(machine, reels).reduce((sum, o) =>
        sum + o.p * (o.symbol.wild ? wildPays(table, o.symbol.id) : table[o.symbol.id]![o.k - 3]!), 0);
}

// Grille visible pour des arrêts donnés : grid[ligne][rouleau]
export function slotGrid(machine: SlotMachine, stops: number[]): string[][] {
    const n = machine.strip.length;
    return Array.from({length: SLOT_ROWS}, (_, row) => stops.map(stop => machine.strip[(stop + row) % n]!));
}

// Ce que paie une ligne : symbole, nombre de cases depuis la gauche, gain (0 : rien)
export function slotLineResult(machine: SlotMachine, table: Record<string, number[]>, ids: string[]) {
    const isWild = (id: string) => machine.symbols.find(s => s.id === id)?.wild === true;
    const target = ids.find(id => !isWild(id));
    if (!target) return {symbol: ids[0]!, count: ids.length, pays: wildPays(table, ids[0]!)};
    let count = 0;
    while (count < ids.length && (ids[count] === target || isWild(ids[count]!))) count++;
    return {symbol: target, count, pays: count >= 3 ? table[target]![count - 3]! : 0};
}

export type SlotWin = { line: number; symbol: string; count: number; pays: number };

// Résultat d'un lancer : grille, lignes gagnantes, gain total (crédits, arrondi en dessous)
export function slotSpin(machine: SlotMachine, stops: number[], bet: number, lines: number) {
    const reels = stops.length;
    const table = slotPaytable(machine, reels);
    const grid = slotGrid(machine, stops);
    const wins: SlotWin[] = [];
    slotLines(reels, lines).forEach((rows, line) => {
        const result = slotLineResult(machine, table, rows.map((row, reel) => grid[row]![reel]!));
        if (result.pays > 0) wins.push({line, ...result});
    });
    const payout = Math.floor(bet * wins.reduce((sum, w) => sum + w.pays, 0) / lines);
    return {grid, wins, payout};
}

// Arrêts tirés au hasard (random(n) : entier de 0 à n - 1, donné par le serveur)
export const slotStops = (machine: SlotMachine, reels: number, random: (n: number) => number) =>
    Array.from({length: reels}, () => random(machine.strip.length));

/*
 * Lancer ⇄ nombre (enregistré avec la partie, colonne seed) : machine, colonnes, lignes et arrêts
 * (bandes de 32 symboles au plus).
 */
export function encodeSlotSpin(machine: number, lines: number, stops: number[]): number {
    const head = (machine * 8 + stops.length) * 16 + lines;
    return stops.reduce((code, s) => code * 32 + s, head);
}

export function decodeSlotSpin(code: number) {
    let rest = code;
    const reels = (() => {
        // le nombre de colonnes est juste avant les arrêts : on l'essaie de 5 à 3
        for (const r of [5, 4, 3]) if (Math.floor(code / 32 ** r / 16) % 8 === r) return r;
        return 3;
    })();
    const stops: number[] = [];
    for (let i = 0; i < reels; i++) {
        stops.unshift(rest % 32);
        rest = Math.floor(rest / 32);
    }
    return {machine: Math.floor(rest / 128), reels, lines: rest % 16, stops};
}
