import {clampXp} from "./xpBounds.js";
import {creditsFor} from "./credits.js";
import {GRID_BANK} from "./gridBankData.js";
import type {Random, WordSizeLimits} from "./words.js";

/*
 * Mots à caser : une grande grille avec quelques cases noires et la liste de tous ses mots.
 * Remplir une grille aussi dense prend plusieurs secondes : elles sont préparées à l'avance
 * (scripts/build-word-grids.mjs), avec une seule façon de caser la liste, même sans aucun mot placé.
 * `cells` décrit la grille ligne par ligne : « # » case noire, « . » case à remplir, une lettre = lettre donnée.
 * Le curseur règle le nombre de mots déjà placés au départ (0 par défaut).
 */

export type MotsACaserPuzzle = { size: number; cells: string; words: string[]; solution: string };
export type PublicMotsACaser = Omit<MotsACaserPuzzle, "solution">;

export const MOTS_A_CASER_DEFAULT_SIZE = 15;
export const MOTS_A_CASER_SIZES: readonly WordSizeLimits[] = [
    {size: 13, min: 0, max: 4, default: 0},
    {size: 15, min: 0, max: 5, default: 0},
    {size: 17, min: 0, max: 6, default: 0},
    {size: 20, min: 0, max: 8, default: 0},
];

const bank = new Map<number, string[]>();
const gridsOf = (size: number) => {
    if (!bank.has(size)) bank.set(size, GRID_BANK[size]?.split(" ").filter(Boolean) ?? []);
    return bank.get(size)!;
};

export const motsACaserGrids = gridsOf;

// Échange lignes et colonnes : les mots restent lisibles, et chaque grille en donne deux
export function transposeGrid(grid: string, size: number): string {
    let out = "";
    for (let col = 0; col < size; col++) {
        for (let row = 0; row < size; row++) out += grid[row * size + col];
    }
    return out;
}

// Emplacements de mots : suites d'au moins deux cases blanches, en ligne puis en colonne
export function wordSlots(cells: string, size: number): number[][] {
    const slots: number[][] = [];
    const scan = (at: (line: number, position: number) => number) => {
        for (let line = 0; line < size; line++) {
            let run: number[] = [];
            for (let position = 0; position <= size; position++) {
                const cell = position < size ? at(line, position) : -1;
                if (cell >= 0 && cells[cell] !== "#") {
                    run.push(cell);
                } else {
                    if (run.length >= 2) slots.push(run);
                    run = [];
                }
            }
        }
    };
    scan((row, col) => row * size + col);
    scan((col, row) => row * size + col);
    return slots;
}

export function generateMotsACaser(size: number, hints: number, random: Random): MotsACaserPuzzle {
    const grids = gridsOf(size);
    if (grids.length === 0) throw new Error(`Taille non proposée : ${size}`);

    const picked = grids[random(grids.length)]!;
    const solution = random(2) === 0 ? picked : transposeGrid(picked, size);
    const slots = wordSlots(solution, size);

    // Mots déjà placés, tirés au hasard
    const remaining = [...slots];
    const given = new Set<number>();
    for (let i = 0; i < hints && remaining.length > 0; i++) {
        const [slot] = remaining.splice(random(remaining.length), 1);
        slot!.forEach(cell => given.add(cell));
    }
    const cells = Array.from(solution, (letter, cell) => (letter === "#" || given.has(cell) ? letter : ".")).join("");
    const words = slots.map(slot => slot.map(cell => solution[cell]).join(""))
        .sort((a, b) => a.length - b.length || a.localeCompare(b));
    return {size, cells, words, solution};
}

// La grille reçue respecte les cases données, et ses emplacements contiennent exactement les mots de la liste
export function isMotsACaserSolution(puzzle: MotsACaserPuzzle, grid: unknown): grid is string {
    if (typeof grid !== "string" || grid.length !== puzzle.cells.length) return false;
    for (let i = 0; i < grid.length; i++) {
        const expected = puzzle.cells[i]!;
        if (expected === "." ? !/^[A-Z]$/.test(grid[i]!) : grid[i] !== expected) return false;
    }
    const placed = wordSlots(grid, puzzle.size).map(slot => slot.map(c => grid[c]).join("")).sort();
    return placed.join() === [...puzzle.words].sort().join();
}

// Ces grilles sont longues à finir : l'XP grandit avec la surface, et baisse avec chaque mot déjà placé
export function motsACaserXp(baseXp: number, size: number, hints: number): number {
    return clampXp(baseXp * 1.5 * Math.pow(size / 13, 2) * (1 - 0.08 * hints));
}

export function motsACaserCredits(size: number, hints: number): number {
    const limits = MOTS_A_CASER_SIZES.find(s => s.size === size);
    return limits ? creditsFor(limits.max - hints, 0, limits.max - limits.min) : 1;
}
