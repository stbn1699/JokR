import {clampXp} from "./xpBounds.js";
import {creditsFor} from "./credits.js";

/*
 * Liens : relier chaque paire de lettres par une ligne continue, sans croisement, en remplissant toute la grille.
 * La grille est construite à partir de vrais chemins qui couvrent tout le plateau : elle a donc toujours
 * une solution. Toute façon de relier les paires qui respecte ces règles gagne.
 */

export type LiensPuzzle = {
    size: number;
    // les deux cases de chaque paire
    pairs: [number, number][];
    solution: number[][];
};
export type PublicLiens = Omit<LiensPuzzle, "solution">;
type Random = (max: number) => number;

export const LIENS_DEFAULT_SIZE = 7;
export const LIENS_SIZES = [
    {size: 5, min: 3, max: 5, default: 4},
    {size: 7, min: 4, max: 8, default: 6},
    {size: 9, min: 6, max: 11, default: 8},
    {size: 11, min: 7, max: 14, default: 10},
    {size: 13, min: 9, max: 17, default: 12},
    {size: 15, min: 10, max: 20, default: 14},
];

const MIN_PATH = 3;

const neighbours = (cell: number, size: number) => {
    const out: number[] = [];
    const row = Math.floor(cell / size), col = cell % size;
    if (row > 0) out.push(cell - size);
    if (col < size - 1) out.push(cell + 1);
    if (row < size - 1) out.push(cell + size);
    if (col > 0) out.push(cell - 1);
    return out;
};

const areAdjacent = (a: number, b: number, size: number) => neighbours(a, size).includes(b);

// Un chemin unique qui passe par toutes les cases : on part d'un serpent, puis on le déforme
// en reliant sans cesse un de ses bouts à une case voisine (et en retournant le morceau concerné)
function randomFullPath(size: number, random: Random): number[] {
    const total = size * size;
    const path = Array.from({length: total}, (_, i) => {
        const row = Math.floor(i / size), col = i % size;
        return row * size + (row % 2 === 0 ? col : size - 1 - col);
    });
    const position = new Int32Array(total);
    path.forEach((cell, index) => { position[cell] = index; });
    const reverse = (from: number, to: number) => {
        for (let i = from, j = to; i < j; i++, j--) {
            [path[i], path[j]] = [path[j]!, path[i]!];
            position[path[i]!] = i;
            position[path[j]!] = j;
        }
    };

    for (let move = 0; move < total * 20; move++) {
        if (random(2) === 0) {
            const options = neighbours(path[total - 1]!, size).filter(cell => cell !== path[total - 2]);
            reverse(position[options[random(options.length)]!]! + 1, total - 1);
        } else {
            const options = neighbours(path[0]!, size).filter(cell => cell !== path[1]);
            reverse(0, position[options[random(options.length)]!]! - 1);
        }
    }
    return path;
}

// Découpe le chemin en `count` lignes d'au moins 3 cases ; null si une ligne a ses deux bouts côte à côte
function cutPath(path: number[], size: number, count: number, random: Random): number[][] | null {
    const lengths = Array.from({length: count}, () => MIN_PATH);
    const weights = lengths.map(() => 1 + random(4));
    const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
    const extra = path.length - count * MIN_PATH;
    weights.forEach((weight, index) => { lengths[index]! += Math.floor(extra * weight / weightSum); });
    for (let left = path.length - lengths.reduce((sum, length) => sum + length, 0); left > 0; left--) lengths[random(count)]!++;

    const paths: number[][] = [];
    let from = 0;
    for (const length of lengths) {
        const line = path.slice(from, from + length);
        if (areAdjacent(line[0]!, line[line.length - 1]!, size)) return null;
        paths.push(line);
        from += length;
    }
    return paths;
}

export function generateLiens(size: number, count: number, random: Random): LiensPuzzle {
    for (let attempt = 0; attempt < 200; attempt++) {
        const full = randomFullPath(size, random);
        let paths: number[][] | null = null;
        for (let cut = 0; cut < 50 && !paths; cut++) paths = cutPath(full, size, count, random);
        if (!paths) continue;
        for (let i = paths.length - 1; i > 0; i--) {
            const j = random(i + 1);
            [paths[i], paths[j]] = [paths[j]!, paths[i]!];
        }
        return {size, pairs: paths.map(path => [path[0]!, path[path.length - 1]!]), solution: paths};
    }
    throw new Error(`Grille impossible (${size}×${size}, ${count} paires)`);
}

// Une ligne par paire, d'une lettre à l'autre, de case en case, sans repasser sur une case et sans en laisser de vide
export function isLiensSolution(puzzle: LiensPuzzle, paths: unknown): paths is number[][] {
    if (!Array.isArray(paths) || paths.length !== puzzle.pairs.length) return false;
    const total = puzzle.size * puzzle.size;
    const seen = new Set<number>();
    const endpoints = new Set(puzzle.pairs.flat());

    for (let index = 0; index < paths.length; index++) {
        const path: unknown = paths[index];
        if (!Array.isArray(path) || path.length < 2 || path.length > total) return false;
        const [a, b] = puzzle.pairs[index]!;
        const first = path[0], last = path[path.length - 1];
        if (!((first === a && last === b) || (first === b && last === a))) return false;
        for (let i = 0; i < path.length; i++) {
            const cell: unknown = path[i];
            if (!Number.isInteger(cell) || (cell as number) < 0 || (cell as number) >= total || seen.has(cell as number)) return false;
            if (i > 0 && !areAdjacent(path[i - 1] as number, cell as number, puzzle.size)) return false;
            // une ligne ne passe pas sur la lettre d'une autre paire
            if (i > 0 && i < path.length - 1 && endpoints.has(cell as number)) return false;
            seen.add(cell as number);
        }
    }
    // la grille doit être entièrement remplie
    return seen.size === total;
}

// Référence : baseXp pour 9×9 en réglage moyen ; plus de paires sur la même grille = plus dur
export function liensXp(baseXp: number, size: number, count: number): number {
    const limits = LIENS_SIZES.find(s => s.size === size);
    const position = limits ? (count - limits.min) / (limits.max - limits.min) : 0.5;
    return clampXp(baseXp * Math.pow(size / 9, 1.5) * (0.7 + 0.6 * position));
}

export function liensCredits(size: number, count: number): number {
    const limits = LIENS_SIZES.find(s => s.size === size);
    return limits ? creditsFor(count, limits.min, limits.max) : 1;
}
