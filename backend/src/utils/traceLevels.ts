import type {TracePuzzle} from "./trace.js";
import {TRACE_LEVEL_DATA} from "./traceLevelData.js";
import {decodeTrace} from "./levelCodes.js";

/*
 * Niveaux du Tracé (mode Niveaux) : grilles fixes, les mêmes pour tout le monde, de plus en plus difficiles.
 * Les TRACE_TUTORIAL premiers niveaux sont les leçons du tutoriel guidé pas à pas (src/Components/Levels/TraceTutorial.tsx).
 * Les grilles des leçons sont construites pour obliger à utiliser la leçon du niveau (voir src/Components/Levels/traceGuide.ts) :
 * 1. un seul passage : depuis le bout du chemin, une seule case libre est atteignable
 * 2. dans l'ordre : on ne passe pas sur un numéro avant son tour
 * 3. le cul-de-sac : une case qui n'aurait plus qu'une sortie doit être prise tout de suite
 * Ne pas modifier une grille publiée : la progression des joueurs est enregistrée par numéro de niveau.
 */

export const TRACE_TUTORIAL = 3;

// Leçons du tutoriel (grilles choisies pour obliger à utiliser leur technique)
const TRACE_LESSONS: TracePuzzle[] = [
    // 1 · 4×4 · un seul passage
    {
        size: 4,
        numbers: [{cell: 1, value: 1}, {cell: 11, value: 2}, {cell: 8, value: 3}],
        walls: [[1, 5], [1, 2], [4, 8], [5, 9], [6, 10], [6, 7], [8, 9], [10, 11], [13, 14]],
    },
    // 2 · 5×5 · dans l'ordre
    {
        size: 5,
        numbers: [{cell: 8, value: 1}, {cell: 17, value: 2}, {cell: 10, value: 3}, {cell: 3, value: 4}, {cell: 24, value: 5}, {cell: 12, value: 6}],
        walls: [[1, 6], [2, 7], [5, 6], [8, 13], [8, 9], [13, 14], [15, 16], [16, 21], [17, 18], [18, 19], [22, 23]],
    },
    // 3 · 5×5 · le cul-de-sac
    {
        size: 5,
        numbers: [{cell: 6, value: 1}, {cell: 4, value: 2}, {cell: 17, value: 3}, {cell: 16, value: 4}],
        walls: [[5, 10], [7, 12], [12, 13], [16, 17]],
    },
];

export const TRACE_LEVELS: TracePuzzle[] = [...TRACE_LESSONS, ...TRACE_LEVEL_DATA.map(decodeTrace)];
