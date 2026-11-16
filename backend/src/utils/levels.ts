import {QUEENS_LEVELS, QUEENS_TUTORIAL} from "./queensLevels.js";
import type {QueensPuzzle} from "./queens.js";
import {GALAXIES_LEVELS, GALAXIES_TUTORIAL} from "./galaxiesLevels.js";
import type {GalaxiesPuzzle} from "./galaxies.js";

/*
 * Mode Niveaux des puzzles : pour chaque jeu, une suite de grilles fixes (les mêmes pour tout le monde), du tutoriel
 * aux grilles les plus retorses. Un niveau se débloque en réussissant le précédent.
 * Pour ajouter un jeu : ses grilles (comme utils/queensLevels.ts), le nombre de niveaux du tutoriel, puis le jeu
 * doit savoir valider une partie de niveau (voir Queens.controller.ts).
 */

export type LevelGame = {
    levels: unknown[];
    // les `tutorial` premiers niveaux forment le tutoriel
    tutorial: number;
    // taille et aide affichées sur la carte des niveaux
    describe: (puzzle: unknown) => { size: number; hints: number };
};

export const LEVEL_GAMES: Record<string, LevelGame> = {
    QUEENS: {
        levels: QUEENS_LEVELS,
        tutorial: QUEENS_TUTORIAL,
        describe: p => ({size: (p as QueensPuzzle).size, hints: (p as QueensPuzzle).queens.length}),
    },
    GALAXIES: {
        levels: GALAXIES_LEVELS,
        tutorial: GALAXIES_TUTORIAL,
        describe: p => ({size: (p as GalaxiesPuzzle).width, hints: (p as GalaxiesPuzzle).walls.length}),
    },
};

export const levelGame = (code: string): LevelGame | undefined => LEVEL_GAMES[code];

// Grille d'un niveau (numérotés à partir de 1), ou undefined
export const levelPuzzle = (code: string, level: number): unknown =>
    Number.isInteger(level) && level >= 1 ? LEVEL_GAMES[code]?.levels[level - 1] : undefined;

// Niveau débloqué : le premier, ou celui qui suit un niveau réussi
export const isLevelUnlocked = (level: number, done: Set<number>) => level === 1 || done.has(level - 1);
