import type {QueensPuzzle} from "./queens.js";

/*
 * Niveaux du Queens (mode Niveaux) : grilles fixes, les mêmes pour tout le monde, de plus en plus difficiles.
 * Générées une fois pour toutes puis choisies selon la technique qu'il faut pour les résoudre :
 * - « une seule case possible » : une ligne, une colonne ou une zone n'a plus qu'une case libre
 * - « croix par déduction » : une dame ici viderait une autre ligne, colonne ou zone (zones coincées comprises)
 * - « au-delà » : ces deux techniques ne suffisent pas, il faut chercher plus loin
 * Les QUEENS_TUTORIAL premiers niveaux forment le tutoriel (textes côté site : src/Components/Levels/queensTutorial.ts).
 * Ne pas modifier une grille publiée : la progression des joueurs est enregistrée par numéro de niveau.
 */

export const QUEENS_TUTORIAL = 4;

export const QUEENS_LEVELS: QueensPuzzle[] = [
    // 1 · 4×4 · tutoriel · une seule case possible
    {
        size: 4,
        regions: [
            1, 1, 0, 0,
            1, 1, 2, 2,
            1, 3, 2, 2,
            1, 3, 3, 2,
        ],
        queens: [2, 11],
    },
    // 2 · 4×4 · tutoriel · une seule case possible
    {
        size: 4,
        regions: [
            1, 1, 0, 0,
            1, 1, 1, 2,
            1, 1, 1, 2,
            3, 3, 1, 2,
        ],
        queens: [4],
    },
    // 3 · 5×5 · tutoriel · une seule case possible
    {
        size: 5,
        regions: [
            1, 2, 2, 0, 0,
            1, 1, 2, 2, 0,
            3, 1, 2, 2, 0,
            3, 4, 2, 2, 0,
            3, 4, 4, 2, 0,
        ],
        queens: [6],
    },
    // 4 · 5×5 · tutoriel · croix par déduction
    {
        size: 5,
        regions: [
            0, 0, 1, 1, 1,
            0, 2, 2, 1, 3,
            0, 2, 4, 3, 3,
            2, 2, 4, 4, 3,
            4, 4, 4, 3, 3,
        ],
        queens: [],
    },
    // 5 · 6×6 · une seule case possible
    {
        size: 6,
        regions: [
            0, 2, 2, 2, 2, 2,
            0, 0, 2, 2, 2, 1,
            2, 2, 2, 2, 3, 3,
            2, 2, 2, 2, 3, 3,
            4, 4, 4, 5, 5, 3,
            4, 4, 4, 5, 5, 3,
        ],
        queens: [],
    },
    // 6 · 6×6 · croix par déduction
    {
        size: 6,
        regions: [
            3, 0, 0, 0, 0, 0,
            3, 1, 0, 0, 2, 2,
            3, 3, 4, 0, 0, 2,
            3, 4, 4, 2, 2, 2,
            4, 4, 4, 5, 2, 5,
            4, 4, 4, 5, 5, 5,
        ],
        queens: [],
    },
    // 7 · 7×7 · croix par déduction
    {
        size: 7,
        regions: [
            2, 2, 2, 0, 0, 0, 1,
            2, 2, 2, 2, 3, 0, 1,
            2, 6, 3, 3, 3, 0, 0,
            2, 6, 6, 6, 3, 3, 3,
            4, 4, 6, 3, 3, 5, 5,
            4, 6, 6, 3, 3, 5, 5,
            4, 6, 6, 6, 3, 3, 5,
        ],
        queens: [],
    },
    // 8 · 7×7 · au-delà des déductions simples
    {
        size: 7,
        regions: [
            0, 1, 1, 2, 2, 2, 2,
            0, 1, 1, 1, 2, 4, 2,
            0, 0, 0, 4, 2, 4, 2,
            3, 3, 5, 4, 4, 4, 4,
            6, 5, 5, 6, 4, 4, 4,
            6, 5, 5, 6, 6, 4, 4,
            6, 6, 6, 6, 6, 4, 4,
        ],
        queens: [],
    },
    // 9 · 8×8 · croix par déduction
    {
        size: 8,
        regions: [
            2, 2, 2, 2, 1, 1, 0, 0,
            2, 2, 2, 1, 1, 1, 0, 0,
            2, 4, 4, 4, 1, 1, 3, 0,
            4, 4, 4, 1, 1, 3, 3, 0,
            4, 4, 4, 6, 3, 3, 3, 3,
            4, 4, 4, 6, 5, 3, 3, 3,
            6, 4, 6, 6, 5, 3, 5, 5,
            6, 6, 6, 6, 5, 5, 5, 7,
        ],
        queens: [],
    },
    // 10 · 8×8 · au-delà des déductions simples
    {
        size: 8,
        regions: [
            2, 2, 2, 0, 0, 1, 1, 1,
            2, 2, 0, 0, 1, 1, 1, 1,
            2, 2, 2, 0, 1, 1, 1, 1,
            3, 2, 2, 2, 2, 2, 2, 1,
            3, 3, 2, 4, 2, 2, 1, 1,
            3, 6, 6, 4, 7, 7, 5, 7,
            6, 6, 4, 4, 7, 7, 7, 7,
            6, 6, 6, 7, 7, 7, 7, 7,
        ],
        queens: [],
    },
];
