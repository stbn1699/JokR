import {QUEENS_LEVELS, QUEENS_TUTORIAL} from "./queensLevels.js";
import type {QueensPuzzle} from "./queens.js";
import {TRACE_LEVELS, TRACE_TUTORIAL} from "./traceLevels.js";
import type {TracePuzzle} from "./trace.js";
import {RIKUDO_LEVELS, RIKUDO_TUTORIAL} from "./rikudoLevels.js";
import type {RikudoPuzzle} from "./rikudo.js";
import {TECTONIC_LEVELS, TECTONIC_TUTORIAL} from "./tectonicLevels.js";
import type {TectonicPuzzle} from "./tectonic.js";
import {SHIKAKU_LEVELS, SHIKAKU_TUTORIAL} from "./shikakuLevels.js";
import type {ShikakuPuzzle} from "./shikaku.js";
import {SUDOKU_LEVELS, SUDOKU_TUTORIAL} from "./sudokuLevels.js";
import {GALAXIES_LEVELS, GALAXIES_TUTORIAL} from "./galaxiesLevels.js";
import type {GalaxiesPuzzle} from "./galaxies.js";
import {BINERO_LEVELS, BINERO_TUTORIAL} from "./bineroLevels.js";
import {type BineroGrid, countBineroClues} from "./binero.js";
import {
    BOUCHON_LESSONS, BOUCLE_LESSONS, COLORIA_LESSONS, DEMINEUR_LESSONS, DEVIMOT_LESSONS, ECHELLE_LESSONS, LIENS_LESSONS,
    MOTS_A_CASER_LESSONS, MOTS_MELES_LESSONS, PATURAGES_LESSONS, TUYAUX_LESSONS,
} from "./gridLessons.js";

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
    BINERO: {
        levels: BINERO_LEVELS,
        tutorial: BINERO_TUTORIAL,
        describe: p => ({size: (p as BineroGrid).length, hints: countBineroClues(p as BineroGrid)}),
    },
    SUDOKU: {
        levels: SUDOKU_LEVELS,
        tutorial: SUDOKU_TUTORIAL,
        describe: p => ({size: 9, hints: (p as number[][]).flat().filter(v => v !== 0).length}),
    },
    SHIKAKU: {
        levels: SHIKAKU_LEVELS,
        tutorial: SHIKAKU_TUTORIAL,
        describe: p => ({size: (p as ShikakuPuzzle).width, hints: (p as ShikakuPuzzle).rects.length}),
    },
    TECTONIC: {
        levels: TECTONIC_LEVELS,
        tutorial: TECTONIC_TUTORIAL,
        describe: p => ({size: (p as TectonicPuzzle).width, hints: (p as TectonicPuzzle).cells.filter(v => v !== null).length}),
    },
    RIKUDO: {
        levels: RIKUDO_LEVELS,
        tutorial: RIKUDO_TUTORIAL,
        describe: p => ({size: (p as RikudoPuzzle).cells.length, hints: (p as RikudoPuzzle).cells.filter(v => v !== null).length}),
    },
    TRACE: {
        levels: TRACE_LEVELS,
        tutorial: TRACE_TUTORIAL,
        describe: p => ({size: (p as TracePuzzle).size, hints: 0}),
    },
};

// Jeux ajoutés depuis 3.3 : pour l'instant, seulement les 3 leçons du tutoriel guidé (voir gridLessons.ts).
// `hints` est aussi le curseur de la partie (voir puzzleGames.ts) : il compte dans l'XP de certains jeux.
const lessonsOnly = <P>(levels: P[], describe: (puzzle: P) => { size: number; hints: number }): LevelGame =>
    ({levels, tutorial: levels.length, describe: p => describe(p as P)});

Object.assign(LEVEL_GAMES, {
    COLORIA: lessonsOnly(COLORIA_LESSONS, p => ({size: p.zones, hints: p.given.filter(c => c >= 0).length})),
    TUYAUX: lessonsOnly(TUYAUX_LESSONS, p => ({size: p.size, hints: p.locked.length})),
    LIENS: lessonsOnly(LIENS_LESSONS, p => ({size: p.size, hints: p.pairs.length})),
    BOUCHON: lessonsOnly(BOUCHON_LESSONS, p => ({size: p.size, hints: p.minMoves})),
    PATURAGES: lessonsOnly(PATURAGES_LESSONS, p => ({size: p.size, hints: p.given.length})),
    BOUCLE: lessonsOnly(BOUCLE_LESSONS, p => ({size: p.size, hints: p.walls.length})),
    DEMINEUR: lessonsOnly(DEMINEUR_LESSONS, p => ({size: p.size, hints: p.mineCount})),
    DEVIMOT: lessonsOnly(DEVIMOT_LESSONS, p => ({size: p.length, hints: p.maxAttempts})),
    ECHELLE: lessonsOnly(ECHELLE_LESSONS, p => ({size: p.length, hints: p.par})),
    MOTSMELES: lessonsOnly(MOTS_MELES_LESSONS, p => ({size: p.size, hints: p.words.length})),
    MOTSACASER: lessonsOnly(MOTS_A_CASER_LESSONS, p => ({size: p.size, hints: 0})),
});

export const levelGame = (code: string): LevelGame | undefined => LEVEL_GAMES[code];

// Grille d'un niveau (numérotés à partir de 1), ou undefined
export const levelPuzzle = (code: string, level: number): unknown =>
    Number.isInteger(level) && level >= 1 ? LEVEL_GAMES[code]?.levels[level - 1] : undefined;

// Niveau débloqué : le premier, ou celui qui suit un niveau réussi
export const isLevelUnlocked = (level: number, done: Set<number>) => level === 1 || done.has(level - 1);
