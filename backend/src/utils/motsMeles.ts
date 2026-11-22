import {clampXp} from "./xpBounds.js";
import {creditsFor} from "./credits.js";
import {solutionWords, WORD_LENGTHS, type Random, type WordSizeLimits} from "./words.js";

/*
 * Mots mêlés : retrouver dans une grille de lettres tous les mots de la liste.
 * 8×8 : horizontal et vertical ; 10×10 : plus les diagonales ; 12×12 : aussi à l'envers.
 * La validation relit les lettres sélectionnées : un mot trouvé ailleurs que là où il a été placé compte aussi.
 */

export type MotsMelesPuzzle = { size: number; letters: string; words: string[] };
export type FoundWord = { word: string; from: number; to: number };

export const MOTS_MELES_DEFAULT_SIZE = 10;
export const MOTS_MELES_SIZES: readonly WordSizeLimits[] = [
    {size: 8, min: 4, max: 8, default: 6},
    {size: 10, min: 6, max: 12, default: 8},
    {size: 12, min: 8, max: 16, default: 10},
];

const STRAIGHT = [[0, 1], [1, 0]] as const;
const DIAGONAL = [[1, 1], [-1, 1]] as const;
const REVERSED = [[0, -1], [-1, 0], [-1, -1], [1, -1]] as const;

// Lettres de remplissage, à peu près dans les proportions du français
const FILLER = "EEEEEEEAAAAAIIIISSSSNNNNRRRRTTTTUUUULLLOOODDCCMMPPVGFBHQJXYZK";

const directionsFor = (size: number): readonly (readonly [number, number])[] => {
    if (size >= 12) return [...STRAIGHT, ...DIAGONAL, ...REVERSED];
    if (size >= 10) return [...STRAIGHT, ...DIAGONAL];
    return STRAIGHT;
};

// Mots distincts, dont aucun n'est contenu dans un autre (sinon un mot se trouverait « en double »)
function pickWords(count: number, random: Random): string[] {
    const picked: string[] = [];
    for (let tries = 0; picked.length < count && tries < count * 50; tries++) {
        const list = solutionWords(WORD_LENGTHS[random(WORD_LENGTHS.length)]!);
        const key = list[random(list.length)]!.key;
        if (!picked.some(word => word.includes(key) || key.includes(word))) picked.push(key);
    }
    return picked;
}

function place(grid: (string | null)[], size: number, word: string, random: Random): boolean {
    const directions = directionsFor(size);
    for (let attempt = 0; attempt < 120; attempt++) {
        const [dr, dc] = directions[random(directions.length)]!;
        const row = random(size);
        const col = random(size);
        const endRow = row + dr * (word.length - 1);
        const endCol = col + dc * (word.length - 1);
        if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue;

        const cells = Array.from(word, (_, i) => (row + dr * i) * size + col + dc * i);
        if (!cells.every((cell, i) => grid[cell] === null || grid[cell] === word[i])) continue;
        cells.forEach((cell, i) => {
            grid[cell] = word[i]!;
        });
        return true;
    }
    return false;
}

export function generateMotsMeles(size: number, count: number, random: Random): MotsMelesPuzzle {
    for (let attempt = 0; attempt < 50; attempt++) {
        const words = pickWords(count, random);
        if (words.length < count) continue;
        const grid: (string | null)[] = Array.from({length: size * size}, () => null);
        // les plus longs d'abord : ce sont les plus difficiles à caser
        if (![...words].sort((a, b) => b.length - a.length).every(word => place(grid, size, word, random))) continue;
        const letters = grid.map(letter => letter ?? FILLER[random(FILLER.length)]!).join("");
        return {size, letters, words: words.sort()};
    }
    throw new Error(`Grille de mots mêlés impossible (${size}×${size}, ${count} mots)`);
}

// Lettres d'une ligne droite entre deux cases (null si elles ne sont pas alignées)
export function readLine(puzzle: MotsMelesPuzzle, from: number, to: number): string | null {
    const {size, letters} = puzzle;
    const total = size * size;
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= total || to >= total) return null;
    const dRow = Math.floor(to / size) - Math.floor(from / size);
    const dCol = (to % size) - (from % size);
    if (dRow !== 0 && dCol !== 0 && Math.abs(dRow) !== Math.abs(dCol)) return null;

    const steps = Math.max(Math.abs(dRow), Math.abs(dCol));
    let text = "";
    for (let i = 0; i <= steps; i++) {
        text += letters[from + (Math.sign(dRow) * size + Math.sign(dCol)) * i];
    }
    return text;
}

export function isMotsMelesSolution(puzzle: MotsMelesPuzzle, found: unknown): found is FoundWord[] {
    if (!Array.isArray(found) || found.length !== puzzle.words.length) return false;
    const missing = new Set(puzzle.words);
    for (const item of found as Partial<FoundWord>[]) {
        if (typeof item?.word !== "string" || !missing.has(item.word)) return false;
        const line = readLine(puzzle, item.from as number, item.to as number);
        if (line !== item.word && line?.split("").reverse().join("") !== item.word) return false;
        missing.delete(item.word);
    }
    return missing.size === 0;
}

// Référence : baseXp pour 10×10 avec 8 mots
export function motsMelesXp(baseXp: number, size: number, words: number): number {
    return clampXp(baseXp * Math.pow(size / 10, 1.4) * (0.5 + words / 16));
}

export function motsMelesCredits(size: number, words: number): number {
    const limits = MOTS_MELES_SIZES.find(s => s.size === size);
    return limits ? creditsFor(words, limits.min, limits.max) : 1;
}
