import {randomInt} from "node:crypto";
import {levelGame} from "../utils/levels.js";
import {difficultyRange, DIFFICULTIES, type Difficulty, STANDARD} from "../utils/social.js";
import {gridGame, isGridGame} from "./gridGames.js";
import {isPuzzleGame, PUZZLE_GAMES, type PuzzleGameCode} from "./puzzleGames.js";
import {GRID_GAMES} from "./gridGames.js";

/*
 * Grille d'un duel (onglet Social), choisie par jeu et difficulté :
 * - jeux avec une banque de niveaux (Sudoku, Binero…) : un niveau pioché dans la tranche de la difficulté
 *   (les niveaux vont du plus simple au plus retors, voir utils/levels.ts)
 * - les autres : une grille neuve à la taille du défi du jour (une seule difficulté, « Standard »)
 */

// Il faut assez de niveaux après le tutoriel pour faire quatre tranches
const MIN_LEVELS = 40;

export const DUEL_GAMES: PuzzleGameCode[] = [...PUZZLE_GAMES, ...Object.keys(GRID_GAMES) as PuzzleGameCode[]];

// Difficultés proposées pour un jeu
export function duelDifficulties(code: PuzzleGameCode): string[] {
    const game = levelGame(code);
    return game && game.levels.length - game.tutorial >= MIN_LEVELS ? [...DIFFICULTIES] : [STANDARD];
}

export type DuelPuzzle = { code: PuzzleGameCode; puzzle: unknown; gridSize: number; emptyCells: number; difficulty: string };

// Grille du duel, ou null si ce jeu n'a pas cette difficulté
export function duelPuzzle(code: string, difficulty: string, random = (max: number) => randomInt(max)): DuelPuzzle | null {
    if (!isPuzzleGame(code) || !duelDifficulties(code).includes(difficulty)) return null;
    if (difficulty !== STANDARD) {
        const game = levelGame(code)!;
        const {from, to} = difficultyRange(difficulty as Difficulty, game.levels.length, game.tutorial);
        const puzzle = game.levels[from - 1 + random(to - from + 1)];
        const {size, hints} = game.describe(puzzle);
        // comme une partie du mode Niveaux : l'aide est le nombre d'indices
        return {code, puzzle, gridSize: size, emptyCells: hints, difficulty};
    }
    if (!isGridGame(code)) return null;
    const game = gridGame(code);
    const puzzle = game.generate(game.daily.size, game.daily.amount, random);
    return {code, puzzle, gridSize: game.gridSize(game.load(puzzle)), emptyCells: game.daily.amount, difficulty};
}
