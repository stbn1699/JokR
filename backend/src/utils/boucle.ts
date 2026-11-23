import {clampXp} from "./xpBounds.js";
import {creditsFor} from "./credits.js";

/*
 * Boucle : tracer une seule boucle fermée qui passe par toutes les cases, sans traverser de mur.
 * La grille part d'une vraie boucle, et les murs sont posés uniquement là où elle ne passe pas :
 * il y a donc toujours une solution. Toute boucle qui respecte les règles gagne.
 * Tailles paires uniquement : une grille impaire n'a aucune boucle passant par toutes ses cases.
 */

export type BoucleWall = [number, number];
export type BouclePuzzle = {
    size: number;
    // deux cases voisines séparées par un mur
    walls: BoucleWall[];
    solution: number[];
};
type Random = (max: number) => number;

export const BOUCLE_DEFAULT_SIZE = 8;
export const BOUCLE_SIZES = [
    {size: 6, min: 6, max: 16, default: 10},
    {size: 8, min: 10, max: 30, default: 18},
    {size: 10, min: 16, max: 50, default: 28},
    {size: 12, min: 24, max: 75, default: 42},
    {size: 14, min: 32, max: 105, default: 58},
];

const edgeKey = (a: number, b: number, size: number) => Math.min(a, b) * size * size + Math.max(a, b);

const areAdjacent = (a: number, b: number, size: number) =>
    Math.abs(Math.floor(a / size) - Math.floor(b / size)) + Math.abs(a % size - b % size) === 1;

// Arbre aléatoire sur une grille deux fois plus petite : le contour de cet arbre est une boucle sur toute la grille
function randomLoop(size: number, random: Random): number[] {
    const half = size / 2;
    const cell = (row: number, col: number) => row * size + col;
    const links = new Set<number>();
    const add = (a: number, b: number) => links.add(edgeKey(a, b, size));
    const remove = (a: number, b: number) => links.delete(edgeKey(a, b, size));

    // chaque bloc de 2×2 cases commence par sa petite boucle
    for (let row = 0; row < half; row++) {
        for (let col = 0; col < half; col++) {
            const [r, c] = [row * 2, col * 2];
            add(cell(r, c), cell(r, c + 1));
            add(cell(r + 1, c), cell(r + 1, c + 1));
            add(cell(r, c), cell(r + 1, c));
            add(cell(r, c + 1), cell(r + 1, c + 1));
        }
    }

    // relier deux blocs voisins fusionne leurs boucles en une seule
    const joinRight = (row: number, col: number) => {
        const [r, c] = [row * 2, col * 2 + 1];
        remove(cell(r, c), cell(r + 1, c));
        remove(cell(r, c + 1), cell(r + 1, c + 1));
        add(cell(r, c), cell(r, c + 1));
        add(cell(r + 1, c), cell(r + 1, c + 1));
    };
    const joinDown = (row: number, col: number) => {
        const [r, c] = [row * 2 + 1, col * 2];
        remove(cell(r, c), cell(r, c + 1));
        remove(cell(r + 1, c), cell(r + 1, c + 1));
        add(cell(r, c), cell(r + 1, c));
        add(cell(r, c + 1), cell(r + 1, c + 1));
    };

    const seen = new Set<number>([random(half * half)]);
    const frontier = (block: number) => {
        const row = Math.floor(block / half), col = block % half;
        const out: {to: number; join: () => void}[] = [];
        if (col < half - 1) out.push({to: block + 1, join: () => joinRight(row, col)});
        if (col > 0) out.push({to: block - 1, join: () => joinRight(row, col - 1)});
        if (row < half - 1) out.push({to: block + half, join: () => joinDown(row, col)});
        if (row > 0) out.push({to: block - half, join: () => joinDown(row - 1, col)});
        return out;
    };
    while (seen.size < half * half) {
        const options = [...seen].flatMap(frontier).filter(option => !seen.has(option.to));
        const chosen = options[random(options.length)]!;
        chosen.join();
        seen.add(chosen.to);
    }

    // parcours de la boucle, case par case
    const total = size * size;
    const next = (from: number, previous: number) => {
        const row = Math.floor(from / size), col = from % size;
        const around = [row > 0 ? from - size : -1, col < size - 1 ? from + 1 : -1, row < size - 1 ? from + size : -1, col > 0 ? from - 1 : -1];
        return around.find(to => to >= 0 && to !== previous && links.has(edgeKey(from, to, size)))!;
    };
    const loop = [0];
    let previous = -1, current = 0;
    while (loop.length < total) {
        const following = next(current, previous);
        previous = current;
        current = following;
        loop.push(current);
    }
    return loop;
}

// Murs posés hors de la boucle, souvent par petits traits droits comme sur une grille dessinée à la main
function placeWalls(size: number, loop: number[], count: number, random: Random): BoucleWall[] {
    const used = new Set(loop.map((cell, i) => edgeKey(cell, loop[(i + 1) % loop.length]!, size)));
    const free: BoucleWall[] = [];
    for (let cell = 0; cell < size * size; cell++) {
        if (cell % size < size - 1 && !used.has(edgeKey(cell, cell + 1, size))) free.push([cell, cell + 1]);
        if (cell + size < size * size && !used.has(edgeKey(cell, cell + size, size))) free.push([cell, cell + size]);
    }
    for (let i = free.length - 1; i > 0; i--) {
        const j = random(i + 1);
        [free[i], free[j]] = [free[j]!, free[i]!];
    }

    const freeKeys = new Set(free.map(([a, b]) => edgeKey(a, b, size)));
    const placed = new Map<number, BoucleWall>();
    for (const wall of free) {
        if (placed.size >= count) break;
        let [a, b] = wall;
        if (placed.has(edgeKey(a, b, size))) continue;
        placed.set(edgeKey(a, b, size), [a, b]);
        // le mur se prolonge tout droit : case suivante perpendiculaire au passage qu'il bloque
        const shift = b - a === 1 ? size : 1;
        for (let length = 1; length < 3 && placed.size < count && random(100) < 55; length++) {
            const [c, d] = [a + shift, b + shift];
            if (d >= size * size || (shift === 1 && a % size === size - 1)) break;
            const key = edgeKey(c, d, size);
            if (!freeKeys.has(key) || placed.has(key)) break;
            placed.set(key, [c, d]);
            [a, b] = [c, d];
        }
    }
    return [...placed.values()];
}

export function generateBoucle(size: number, wallCount: number, random: Random): BouclePuzzle {
    const solution = randomLoop(size, random);
    return {size, walls: placeWalls(size, solution, wallCount, random), solution};
}

// Toutes les cases, une seule fois, de voisine en voisine, sans mur, et la dernière rejoint la première
export function isBoucleSolution(puzzle: BouclePuzzle, loop: unknown): loop is number[] {
    const {size} = puzzle;
    const total = size * size;
    if (!Array.isArray(loop) || loop.length !== total) return false;
    const walls = new Set(puzzle.walls.map(([a, b]) => edgeKey(a, b, size)));
    const seen = new Set<number>();
    for (let i = 0; i < total; i++) {
        const cell: unknown = loop[i], following: unknown = loop[(i + 1) % total];
        if (!Number.isInteger(cell) || (cell as number) < 0 || (cell as number) >= total || seen.has(cell as number)) return false;
        if (!Number.isInteger(following) || !areAdjacent(cell as number, following as number, size)) return false;
        if (walls.has(edgeKey(cell as number, following as number, size))) return false;
        seen.add(cell as number);
    }
    return seen.size === total;
}

// Moins de murs = moins d'indices = plus dur
const hardness = (size: number, walls: number) => {
    const limits = BOUCLE_SIZES.find(s => s.size === size);
    return limits ? (limits.max - walls) / (limits.max - limits.min) : 0.5;
};

// Référence : baseXp pour 10×10 en réglage moyen
export function boucleXp(baseXp: number, size: number, walls: number): number {
    return clampXp(baseXp * Math.pow(size / 10, 1.6) * (0.7 + 0.6 * hardness(size, walls)));
}

export function boucleCredits(size: number, walls: number): number {
    const limits = BOUCLE_SIZES.find(s => s.size === size);
    return limits ? creditsFor(limits.max + limits.min - walls, limits.min, limits.max) : 1;
}
