import {ACCEPTED_WORDS, LADDER_WORDS, SOLUTION_WORDS} from "./wordData.js";
import {normalizeWord} from "./normalizeWord.js";

/*
 * Dictionnaire des jeux de mots (dérivé de Lexique 4.10, CC BY-SA 4.0 : voir wordData.ts).
 * - mots acceptés : tout ce qu'un joueur peut proposer (pluriels et conjugaisons compris)
 * - solutions : mots de base courants, les seuls qu'on demande de trouver
 * Les mots se comparent en majuscules et sans accents.
 */

export const WORD_LENGTHS = [4, 5, 6] as const;
export type WordLength = typeof WORD_LENGTHS[number];
export type SolutionWord = { word: string; key: string };
export type Random = (max: number) => number;

// Réglages d'une partie : une taille et une plage pour le second curseur (essais, étapes, mots)
export type WordSizeLimits = { size: number; min: number; max: number; default: number };

export const isWordLength = (n: unknown): n is WordLength => WORD_LENGTHS.includes(n as WordLength);

const accepted = new Set(WORD_LENGTHS.flatMap(n => ACCEPTED_WORDS[n].split(" ")));

const solutions = Object.fromEntries(WORD_LENGTHS.map(n => [
    n,
    SOLUTION_WORDS[n].split(" ").map(word => ({word, key: normalizeWord(word)})),
])) as Record<WordLength, SolutionWord[]>;

// Mot saisi par un joueur : espaces retirés, taille bornée avant la normalisation
export const normalizeWordInput = (word: string) => normalizeWord(word.trim().slice(0, 12));

export const isAcceptedWord = (key: string) => accepted.has(key);
export const solutionWords = (length: WordLength) => solutions[length];
export const ladderWords = (length: WordLength) => LADDER_WORDS[length].split(" ");

// Tailles proposées, avec l'XP et les crédits de chaque valeur du curseur (affichés avant de jouer)
export function wordSettings(
    defaultSize: number,
    sizes: readonly WordSizeLimits[],
    xp: (size: number, amount: number) => number,
    credits: (size: number, amount: number) => number,
) {
    return {
        defaultSize,
        sizes: sizes.map(limits => {
            const xpByAmount: Record<number, number> = {};
            const creditsByAmount: Record<number, number> = {};
            for (let amount = limits.min; amount <= limits.max; amount++) {
                xpByAmount[amount] = xp(limits.size, amount);
                creditsByAmount[amount] = credits(limits.size, amount);
            }
            return {...limits, xpByAmount, creditsByAmount};
        }),
    };
}
