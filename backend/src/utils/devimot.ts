import {clampXp} from "./xpBounds.js";
import {creditsFor} from "./credits.js";
import {solutionWords, type Random, type WordLength, type WordSizeLimits} from "./words.js";

/*
 * Devimot : deviner un mot de 4 à 6 lettres en un nombre d'essais limité.
 * Le mot reste sur le serveur : le joueur ne reçoit que le résultat de chaque essai.
 */

export type LetterMark = "correct" | "present" | "absent";
export type DevimotGuess = { word: string; marks: LetterMark[] };
export type DevimotPuzzle = { length: WordLength; maxAttempts: number; secret: string; answer: string; guesses: DevimotGuess[] };

export const DEVIMOT_DEFAULT_SIZE = 5;
export const DEVIMOT_SIZES: readonly WordSizeLimits[] = [
    {size: 4, min: 5, max: 8, default: 6},
    {size: 5, min: 5, max: 8, default: 6},
    {size: 6, min: 5, max: 8, default: 6},
];

export function generateDevimot(length: WordLength, maxAttempts: number, random: Random): DevimotPuzzle {
    const words = solutionWords(length);
    const {word, key} = words[random(words.length)]!;
    return {length, maxAttempts, secret: key, answer: word, guesses: []};
}

// Une lettre présente plusieurs fois n'est marquée qu'autant de fois qu'elle existe dans le mot
export function scoreGuess(secret: string, guess: string): LetterMark[] {
    const marks: LetterMark[] = Array.from({length: guess.length}, () => "absent");
    const remaining = new Map<string, number>();

    for (let i = 0; i < secret.length; i++) {
        if (guess[i] === secret[i]) marks[i] = "correct";
        else remaining.set(secret[i]!, (remaining.get(secret[i]!) ?? 0) + 1);
    }
    for (let i = 0; i < guess.length; i++) {
        const left = remaining.get(guess[i]!) ?? 0;
        if (marks[i] !== "correct" && left > 0) {
            marks[i] = "present";
            remaining.set(guess[i]!, left - 1);
        }
    }
    return marks;
}

// Référence : baseXp pour 5 lettres en 5 essais ; plus d'essais = moins d'XP
export function devimotXp(baseXp: number, length: number, attempts: number): number {
    return clampXp(baseXp * Math.pow(length / 5, 1.3) * (1 - 0.5 * (attempts - 5) / 3));
}

export const devimotCredits = (_length: number, attempts: number) => creditsFor(8 - attempts, 0, 3);
