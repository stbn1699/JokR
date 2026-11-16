import type {QueensPuzzle} from "./queens.js";
import {QUEENS_LEVEL_DATA} from "./queensLevelData.js";

/*
 * Niveaux du Queens (mode Niveaux) : 1000 grilles fixes, les mêmes pour tout le monde, de plus en plus difficiles.
 * Ici les leçons du tutoriel ; les niveaux suivants sont dans queensLevelData.ts (une ligne par niveau).
 * Générées une fois pour toutes puis choisies selon la technique qu'il faut pour les résoudre :
 * - « une seule case possible » : une ligne, une colonne ou une zone n'a plus qu'une case libre
 * - « croix par déduction » : une dame ici viderait une autre ligne, colonne ou zone (zones coincées comprises)
 * - « au-delà » : ces deux techniques ne suffisent pas, il faut chercher plus loin
 * Les QUEENS_TUTORIAL premiers niveaux forment le tutoriel guidé pas à pas (src/Components/Levels/QueensTutorial.tsx) :
 * leurs grilles sont choisies pour obliger à utiliser la leçon du niveau (voir src/Components/Levels/queensGuide.ts).
 * Ne pas modifier une grille publiée : la progression des joueurs est enregistrée par numéro de niveau.
 */

export const QUEENS_TUTORIAL = 3;

// Leçons du tutoriel (grilles choisies pour obliger à utiliser leur technique)
const QUEENS_LESSONS: QueensPuzzle[] = [
    // 1 · 4×4 · tutoriel · commandes, une dame par ligne / colonne / zone, pas de contact
    {
        size: 4,
        regions: [
            0, 0, 1, 1,
            0, 0, 1, 1,
            2, 2, 3, 3,
            2, 2, 3, 3,
        ],
        queens: [1],
    },
    // 2 · 5×5 · tutoriel · une zone sur une seule ligne
    {
        size: 5,
        regions: [
            0, 0, 1, 1, 1,
            0, 1, 1, 1, 1,
            4, 2, 3, 1, 1,
            4, 2, 3, 3, 3,
            4, 4, 4, 3, 3,
        ],
        queens: [],
    },
    // 3 · 6×6 · tutoriel · deux zones sur deux lignes
    {
        size: 6,
        regions: [
            1, 1, 0, 0, 2, 2,
            1, 3, 0, 2, 2, 2,
            3, 3, 2, 2, 2, 4,
            3, 3, 2, 4, 4, 4,
            5, 5, 5, 4, 4, 4,
            5, 5, 5, 4, 4, 4,
        ],
        queens: [],
    },
];

// "<taille>:<zone de chaque case en base 36>" → grille sans dame donnée
function decode(line: string): QueensPuzzle {
    const [size, cells] = line.split(":") as [string, string];
    return {size: Number(size), regions: [...cells].map(c => parseInt(c, 36)), queens: []};
}

export const QUEENS_LEVELS: QueensPuzzle[] = [...QUEENS_LESSONS, ...QUEENS_LEVEL_DATA.map(decode)];
