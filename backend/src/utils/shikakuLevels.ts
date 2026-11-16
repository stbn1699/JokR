import type {ShikakuPuzzle} from "./shikaku.js";
import {SHIKAKU_LEVEL_DATA} from "./shikakuLevelData.js";
import {decodeShikaku} from "./levelCodes.js";

/*
 * Niveaux du Shikaku (mode Niveaux) : grilles fixes, les mêmes pour tout le monde, de plus en plus difficiles.
 * Les SHIKAKU_TUTORIAL premiers niveaux sont les leçons du tutoriel guidé pas à pas (src/Components/Levels/ShikakuTutorial.tsx).
 * Les grilles des leçons sont choisies pour obliger à utiliser la leçon du niveau (voir src/Components/Levels/shikakuGuide.ts) :
 * 1. le seul rectangle : un nombre n'a qu'une place possible
 * 2. la case orpheline : une case qu'un seul nombre peut atteindre lui revient
 * 3. les cases sûres : les cases communes à toutes les places possibles d'un nombre lui reviennent
 * Ne pas modifier une grille publiée : la progression des joueurs est enregistrée par numéro de niveau.
 */

export const SHIKAKU_TUTORIAL = 3;

// Leçons du tutoriel (grilles choisies pour obliger à utiliser leur technique)
const SHIKAKU_LESSONS: ShikakuPuzzle[] = [
    // 1 · 4×4 · le seul rectangle
    {
        width: 4, height: 4, rects: [],
        clues: [{cell: 5, area: 4}, {cell: 7, area: 2}, {cell: 9, area: 2}, {cell: 11, area: 2}, {cell: 13, area: 2}, {cell: 14, area: 4}],
    },
    // 2 · 5×5 · la case orpheline
    {
        width: 5, height: 5, rects: [],
        clues: [{cell: 2, area: 6}, {cell: 4, area: 4}, {cell: 16, area: 6}, {cell: 17, area: 6}, {cell: 22, area: 3}],
    },
    // 3 · 4×4 · les cases sûres
    {
        width: 4, height: 4, rects: [],
        clues: [{cell: 1, area: 3}, {cell: 4, area: 2}, {cell: 7, area: 3}, {cell: 12, area: 4}, {cell: 14, area: 4}],
    },
];

export const SHIKAKU_LEVELS: ShikakuPuzzle[] = [...SHIKAKU_LESSONS, ...SHIKAKU_LEVEL_DATA.map(decodeShikaku)];
