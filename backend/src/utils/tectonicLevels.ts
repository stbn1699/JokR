import type {TectonicPuzzle} from "./tectonic.js";
import {TECTONIC_LEVEL_DATA} from "./tectonicLevelData.js";
import {decodeTectonic} from "./levelCodes.js";

/*
 * Niveaux du Tectonic (mode Niveaux) : grilles fixes, les mêmes pour tout le monde, de plus en plus difficiles.
 * Les TECTONIC_TUTORIAL premiers niveaux sont les leçons du tutoriel guidé pas à pas (src/Components/Levels/TectonicTutorial.tsx).
 * Les grilles des leçons sont choisies pour obliger à utiliser la leçon du niveau (voir src/Components/Levels/tectonicGuide.ts) :
 * 1. le dernier nombre : une zone n'a plus qu'une case vide
 * 2. la seule place : dans une zone, un nombre n'a plus qu'une case possible (les autres touchent déjà ce nombre)
 * 3. le seul nombre : une case ne peut plus prendre qu'un nombre
 * Ne pas modifier une grille publiée : la progression des joueurs est enregistrée par numéro de niveau.
 */

export const TECTONIC_TUTORIAL = 3;

const _ = null;

// Leçons du tutoriel (grilles choisies pour obliger à utiliser leur technique)
const TECTONIC_LESSONS: TectonicPuzzle[] = [
    // 1 · 5×5 · le dernier nombre
    {
        width: 5, height: 5,
        regions: [0, 0, 1, 1, 1, 2, 0, 0, 3, 3, 2, 2, 2, 3, 3, 4, 4, 2, 5, 5, 4, 4, 4, 5, 5],
        cells: [3, 2, 3, _, 1, _, _, 1, _, 3, 2, 3, 5, 2, 1, 4, _, 4, 3, 4, 3, 5, 2, 1, 2],
    },
    // 2 · 5×5 · la seule place
    {
        width: 5, height: 5,
        regions: [0, 1, 2, 2, 2, 0, 1, 1, 1, 3, 0, 1, 4, 4, 3, 5, 5, 4, 4, 3, 5, 5, 5, 4, 3],
        cells: [1, 2, 1, 2, 3, _, _, 3, 4, 1, _, _, 2, 5, 3, 3, 5, _, _, 2, _, _, 2, 3, 4],
    },
    // 3 · 5×5 · le seul nombre
    {
        width: 5, height: 5,
        regions: [0, 1, 1, 1, 2, 0, 0, 1, 2, 2, 0, 0, 1, 2, 2, 3, 3, 3, 3, 4, 3, 4, 4, 4, 4],
        cells: [2, 1, _, _, 2, 5, _, 2, _, _, 1, _, _, 4, 5, 2, _, 1, 3, 1, _, 3, 2, 4, 5],
    },
];

export const TECTONIC_LEVELS: TectonicPuzzle[] = [...TECTONIC_LESSONS, ...TECTONIC_LEVEL_DATA.map(decodeTectonic)];
