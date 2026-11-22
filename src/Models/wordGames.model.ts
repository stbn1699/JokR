import type {WinResult} from "./gameResult.model.ts";

// Réglages d'un jeu de mots : tailles proposées, plage du curseur, XP et crédits de chaque valeur
export interface WordSizeSettings {
    size: number;
    min: number;
    max: number;
    default: number;
    xpByAmount: Record<number, number>;
    creditsByAmount: Record<number, number>;
}

export interface WordGameSettings {
    defaultSize: number;
    sizes: WordSizeSettings[];
}

export type LetterMark = "correct" | "present" | "absent";
export type DevimotGuess = { word: string; marks: LetterMark[] };
export type DevimotPuzzle = { length: number; maxAttempts: number; guesses: DevimotGuess[] };
export type DevimotAnswer = { marks: LetterMark[]; state: "playing" | "won" | "lost"; answer?: string; result?: WinResult };

export type EchellePuzzle = { length: number; start: string; target: string; par: number };

export type MotsMelesPuzzle = { size: number; letters: string; words: string[] };
export type FoundWord = { word: string; from: number; to: number };

// `cells`, ligne par ligne : « # » case noire, « . » case à remplir, une lettre = lettre donnée
export type MotsACaserPuzzle = { size: number; cells: string; words: string[] };
