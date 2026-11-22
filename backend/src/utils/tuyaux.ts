import {clampXp} from "./xpBounds.js";
import {creditsFor} from "./credits.js";

/*
 * Tuyaux : tourner les pièces pour que tous les tuyaux forment un seul réseau, sans boucle ni extrémité ouverte.
 * Une pièce est un masque de ses sorties : 1 = haut, 2 = droite, 4 = bas, 8 = gauche.
 * La grille part d'un arbre couvrant aléatoire dont les pièces sont tournées au hasard.
 * Toute orientation qui respecte les règles gagne, même si ce n'est pas celle du générateur.
 */

export type TuyauxPuzzle = {
    size: number;
    // pièces de départ, ligne par ligne
    tiles: number[];
    // cases données : déjà bien orientées, elles ne tournent pas
    locked: number[];
    solution: number[];
};
export type PublicTuyaux = Omit<TuyauxPuzzle, "solution">;
type Random = (max: number) => number;

const maxHints = (size: number) => Math.floor(size * size * 0.3);

export const TUYAUX_DEFAULT_SIZE = 7;
export const TUYAUX_SIZES = [5, 7, 10, 15, 20].map(size => ({size, min: 0, max: maxHints(size), default: 0}));

const DIRECTIONS = [1, 2, 4, 8] as const;
const opposite = (bit: number) => (bit << 2 | bit >> 2) & 15;

export function rotateTile(mask: number, turns: number): number {
    const t = ((turns % 4) + 4) % 4;
    return ((mask << t) | (mask >> (4 - t))) & 15;
}

// Case voisine dans une direction, -1 hors de la grille
function neighbour(cell: number, bit: number, size: number): number {
    const row = Math.floor(cell / size), col = cell % size;
    if (bit === 1) return row > 0 ? cell - size : -1;
    if (bit === 2) return col < size - 1 ? cell + 1 : -1;
    if (bit === 4) return row < size - 1 ? cell + size : -1;
    return col > 0 ? cell - 1 : -1;
}

// Toutes les sorties se font face, tout est relié, et il n'y a aucune boucle
export function isTuyauxSolved(masks: readonly number[], size: number): boolean {
    let links = 0;
    for (let cell = 0; cell < masks.length; cell++) {
        for (const bit of DIRECTIONS) {
            if (!(masks[cell]! & bit)) continue;
            const next = neighbour(cell, bit, size);
            if (next < 0 || !(masks[next]! & opposite(bit))) return false;
            links++;
        }
    }
    // chaque liaison est comptée deux fois ; un arbre de n cases a n - 1 liaisons
    if (links / 2 !== masks.length - 1) return false;

    const seen = new Uint8Array(masks.length);
    const stack = [0];
    seen[0] = 1;
    let reached = 0;
    while (stack.length) {
        const cell = stack.pop()!;
        reached++;
        for (const bit of DIRECTIONS) {
            if (!(masks[cell]! & bit)) continue;
            const next = neighbour(cell, bit, size);
            if (!seen[next]) {
                seen[next] = 1;
                stack.push(next);
            }
        }
    }
    return reached === masks.length;
}

// Arbre couvrant aléatoire, en évitant les croix à 4 sorties (elles n'ont rien à tourner)
function randomTree(size: number, random: Random): number[] {
    const total = size * size;
    const masks = new Array<number>(total).fill(0);
    const inTree = new Uint8Array(total);
    const degree = new Uint8Array(total);
    const start = random(total);
    inTree[start] = 1;
    let edges: [number, number][] = DIRECTIONS.flatMap(bit => (neighbour(start, bit, size) >= 0 ? [[start, bit] as [number, number]] : []));

    for (let placed = 1; placed < total;) {
        edges = edges.filter(([cell, bit]) => !inTree[neighbour(cell, bit, size)]);
        const open = edges.filter(([cell]) => degree[cell]! < 3);
        const pool = open.length > 0 ? open : edges;
        const [cell, bit] = pool[random(pool.length)]!;
        const next = neighbour(cell, bit, size);
        masks[cell] = masks[cell]! | bit;
        masks[next] = masks[next]! | opposite(bit);
        degree[cell] = degree[cell]! + 1;
        degree[next] = degree[next]! + 1;
        inTree[next] = 1;
        placed++;
        for (const out of DIRECTIONS) {
            const after = neighbour(next, out, size);
            if (after >= 0 && !inTree[after]) edges.push([next, out]);
        }
    }
    return masks;
}

export function generateTuyaux(size: number, hints: number, random: Random): TuyauxPuzzle {
    const solution = randomTree(size, random);
    const cells = Array.from({length: solution.length}, (_, i) => i);
    for (let i = cells.length - 1; i > 0; i--) {
        const j = random(i + 1);
        [cells[i], cells[j]] = [cells[j]!, cells[i]!];
    }
    const locked = cells.slice(0, hints).sort((a, b) => a - b);
    const fixed = new Set(locked);

    for (;;) {
        const tiles = solution.map((mask, cell) => (fixed.has(cell) ? mask : rotateTile(mask, random(4))));
        if (!isTuyauxSolved(tiles, size)) return {size, tiles, locked, solution};
    }
}

// `turns` : quarts de tour appliqués à chaque pièce de départ
export function isTuyauxSolution(puzzle: TuyauxPuzzle, turns: unknown): turns is number[] {
    if (!Array.isArray(turns) || turns.length !== puzzle.tiles.length) return false;
    if (!turns.every(t => Number.isInteger(t) && t >= 0 && t <= 3)) return false;
    if (puzzle.locked.some(cell => turns[cell] !== 0)) return false;
    return isTuyauxSolved(puzzle.tiles.map((tile, cell) => rotateTile(tile, turns[cell] as number)), puzzle.size);
}

// Référence : baseXp pour 10×10 sans aide ; toute l'aide possible retire la moitié
export function tuyauxXp(baseXp: number, size: number, hints: number): number {
    return clampXp(baseXp * Math.pow(size / 10, 1.6) * (1 - 0.5 * hints / maxHints(size)));
}

export const tuyauxCredits = (size: number, hints: number) => creditsFor(maxHints(size) - hints, 0, maxHints(size));
