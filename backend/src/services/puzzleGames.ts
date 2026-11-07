import {countClues} from "./Sudoku.service.js";
import {toApiGrid} from "./Binero.service.js";
import {type BineroGrid, countBineroClues} from "../utils/binero.js";
import {bineroStore, galaxiesStore, queensStore, rikudoStore, shikakuStore, sudokuStore, tectonicStore} from "./stores.js";
import {countRikudoClues, type RikudoPuzzle} from "../utils/rikudo.js";
import {countTectonicClues, type TectonicPuzzle} from "../utils/tectonic.js";
import type {GalaxiesPuzzle} from "../utils/galaxies.js";
import type {ShikakuPuzzle} from "../utils/shikaku.js";
import type {QueensPuzzle} from "../utils/queens.js";

/*
 * Parties lancées à partir d'une grille déjà connue (défi du jour, défi rejoué, défi entre amis) :
 * la grille est rangée dans la mémoire de son jeu et se valide ensuite comme une partie normale.
 * Les grilles sont gardées telles que le serveur les génère (ex. Binero avant conversion pour le site).
 */

export const PUZZLE_GAMES = ["SUDOKU", "BINERO", "RIKUDO", "TECTONIC", "GALAXIES", "SHIKAKU", "QUEENS"] as const;
export type PuzzleGameCode = typeof PUZZLE_GAMES[number];

export const isPuzzleGame = (code: string): code is PuzzleGameCode => (PUZZLE_GAMES as readonly string[]).includes(code);

// Range la grille dans la mémoire du jeu ; `daily` = date si la partie compte pour le classement du jour
export function startPuzzle(code: PuzzleGameCode, puzzle: unknown, daily?: string): { gameId: string; grid: unknown } {
    const options = daily ? {daily} : {};
    switch (code) {
        case "SUDOKU": {
            const grid = puzzle as number[][];
            return {gameId: sudokuStore.create(grid, countClues(grid), options), grid};
        }
        case "RIKUDO": {
            const rikudo = puzzle as RikudoPuzzle;
            return {gameId: rikudoStore.create(rikudo, countRikudoClues(rikudo), options), grid: rikudo};
        }
        case "TECTONIC": {
            const tectonic = puzzle as TectonicPuzzle;
            return {gameId: tectonicStore.create(tectonic, countTectonicClues(tectonic), options), grid: tectonic};
        }
        case "GALAXIES": {
            const galaxies = puzzle as GalaxiesPuzzle;
            return {gameId: galaxiesStore.create(galaxies, galaxies.walls.length, options), grid: galaxies};
        }
        case "SHIKAKU": {
            const shikaku = puzzle as ShikakuPuzzle;
            return {gameId: shikakuStore.create(shikaku, shikaku.rects.length, options), grid: shikaku};
        }
        case "QUEENS": {
            const queens = puzzle as QueensPuzzle;
            return {gameId: queensStore.create(queens, queens.queens.length, options), grid: queens};
        }
        case "BINERO": {
            const grid = puzzle as BineroGrid;
            return {gameId: bineroStore.create(grid, countBineroClues(grid), options), grid: toApiGrid(grid)};
        }
    }
}

// Grille d'une partie gagnée il y a moins de 24 h (null si elle n'est plus en mémoire)
export function finishedPuzzle(code: PuzzleGameCode, gameId: string): unknown {
    const stores = {
        SUDOKU: sudokuStore, BINERO: bineroStore, RIKUDO: rikudoStore, TECTONIC: tectonicStore,
        GALAXIES: galaxiesStore, SHIKAKU: shikakuStore, QUEENS: queensStore,
    } as const;
    return stores[code].getFinished(gameId)?.puzzle ?? null;
}
