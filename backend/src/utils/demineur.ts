import {clampXp} from "./xpBounds.js";
import {creditsFor} from "./credits.js";

/*
 * Démineur : libérer toutes les cases sans mine.
 * Les mines ne sont posées qu'au premier clic, loin de la case cliquée : le premier clic n'explose jamais
 * et ouvre toujours une zone. Le serveur garde les mines et répond case par case : le navigateur
 * ne voit une mine qu'à la fin de la partie.
 */

export type DemineurPuzzle = {
    size: number;
    mineCount: number;
    // null tant que le premier clic n'a pas eu lieu
    mines: Set<number> | null;
    // cases libérées, avec leur nombre de mines voisines
    revealed: Map<number, number>;
    // défi du jour : mines déjà sautées (la partie continue, avec du temps en plus)
    blown: Set<number>;
    // grille connue d'avance (défi du jour, défi passé ou d'un·e ami·e) : une mine ne fait pas perdre, elle coûte du temps
    forgiving?: boolean;
};
type Random = (max: number) => number;

// Case libérée : [case, mines voisines] (case = ligne × taille + colonne)
export type RevealedCell = [number, number];
export type RevealOutcome =
    | { kind: "revealed"; cells: RevealedCell[] }
    | { kind: "exploded"; cell: number; mines: number[] };

// Grille connue d'avance (défis) : une mine ne termine pas la partie, elle ajoute ce temps au chrono
export const DEMINEUR_DAILY_PENALTY_MS = 30_000;

export const DEMINEUR_DEFAULT_SIZE = 10;
export const DEMINEUR_SIZES = [
    {size: 8, min: 6, max: 16, default: 10},
    {size: 10, min: 10, max: 25, default: 15},
    {size: 12, min: 14, max: 36, default: 22},
    {size: 16, min: 26, max: 64, default: 40},
    {size: 20, min: 40, max: 100, default: 64},
];

export function neighbours(cell: number, size: number): number[] {
    const row = Math.floor(cell / size), col = cell % size;
    const result: number[] = [];
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            const [r, c] = [row + dr, col + dc];
            if ((dr || dc) && r >= 0 && c >= 0 && r < size && c < size) result.push(r * size + c);
        }
    }
    return result;
}

export function createDemineur(size: number, mineCount: number): DemineurPuzzle {
    return {size, mineCount, mines: null, revealed: new Map(), blown: new Set()};
}

// Mines tirées au hasard hors de la case cliquée et de ses voisines
export function placeMines(size: number, mineCount: number, safe: number, random: Random): Set<number> {
    const excluded = new Set([safe, ...neighbours(safe, size)]);
    const candidates = Array.from({length: size * size}, (_, cell) => cell).filter(cell => !excluded.has(cell));
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = random(i + 1);
        const swap = candidates[i]!;
        candidates[i] = candidates[j]!;
        candidates[j] = swap;
    }
    return new Set(candidates.slice(0, mineCount));
}

const isCell = (value: unknown, size: number): value is number =>
    Number.isInteger(value) && (value as number) >= 0 && (value as number) < size * size;

/*
 * Libère les cases demandées (un clic, ou les voisines d'un chiffre déjà entouré de ses drapeaux).
 * Une case sans mine voisine libère aussi ses voisines, de proche en proche.
 * Renvoie null si la demande n'a pas de sens (case hors de la grille).
 */
export function reveal(puzzle: DemineurPuzzle, cells: unknown, random: Random): RevealOutcome | null {
    const {size} = puzzle;
    if (!Array.isArray(cells) || cells.length === 0 || cells.length > 8 || !cells.every(cell => isCell(cell, size))) return null;
    const wanted: number[] = cells;
    if (!puzzle.mines) puzzle.mines = placeMines(size, puzzle.mineCount, wanted[0]!, random);
    const mines = puzzle.mines;

    const hit = wanted.find(cell => mines.has(cell) && !puzzle.blown.has(cell));
    if (hit !== undefined) return {kind: "exploded", cell: hit, mines: [...mines]};

    const opened: RevealedCell[] = [];
    const queue = wanted.filter(cell => !puzzle.revealed.has(cell) && !mines.has(cell));
    while (queue.length) {
        const cell = queue.pop()!;
        if (puzzle.revealed.has(cell)) continue;
        const around = neighbours(cell, size);
        const count = around.filter(n => mines.has(n)).length;
        puzzle.revealed.set(cell, count);
        opened.push([cell, count]);
        if (count === 0) queue.push(...around.filter(n => !puzzle.revealed.has(n)));
    }
    return {kind: "revealed", cells: opened};
}

export const isDemineurCleared = (puzzle: DemineurPuzzle) =>
    puzzle.mines !== null && puzzle.revealed.size === puzzle.size * puzzle.size - puzzle.mineCount;

// 0 = peu de mines, 1 = le maximum proposé pour cette taille
const hardness = (size: number, mines: number) => {
    const limits = DEMINEUR_SIZES.find(s => s.size === size);
    return limits ? (mines - limits.min) / (limits.max - limits.min) : 0.5;
};

// Référence : baseXp pour 10×10 en réglage moyen
export function demineurXp(baseXp: number, size: number, mines: number): number {
    return clampXp(baseXp * Math.pow(size / 10, 1.4) * (0.7 + 0.6 * hardness(size, mines)));
}

export function demineurCredits(size: number, mines: number): number {
    const limits = DEMINEUR_SIZES.find(s => s.size === size);
    return limits ? creditsFor(mines, limits.min, limits.max) : 1;
}
