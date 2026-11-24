import {countClues} from "./Sudoku.service.js";
import {toApiGrid} from "./Binero.service.js";
import {type BineroGrid, countBineroClues} from "../utils/binero.js";
import {bineroStore, galaxiesStore, queensStore, rikudoStore, shikakuStore, sudokuStore, tectonicStore, traceStore} from "./stores.js";
import {countRikudoClues, type RikudoPuzzle} from "../utils/rikudo.js";
import {countTectonicClues, type TectonicPuzzle} from "../utils/tectonic.js";
import type {GalaxiesPuzzle} from "../utils/galaxies.js";
import type {ShikakuPuzzle} from "../utils/shikaku.js";
import type {QueensPuzzle} from "../utils/queens.js";
import type {TracePuzzle} from "../utils/trace.js";
import {gridGame, type GridGameCode, isGridGame} from "./gridGames.js";

/*
 * Parties lancées à partir d'une grille déjà connue (défi du jour, défi rejoué, défi entre amis) :
 * la grille est rangée dans la mémoire de son jeu et se valide ensuite comme une partie normale.
 * Les grilles sont gardées telles que le serveur les génère (ex. Binero avant conversion pour le site).
 */

export const PUZZLE_GAMES = ["SUDOKU", "BINERO", "RIKUDO", "TECTONIC", "GALAXIES", "SHIKAKU", "QUEENS", "TRACE"] as const;
// + les jeux de grille ajoutés depuis 3.3 (voir gridGames.ts)
export type PuzzleGameCode = typeof PUZZLE_GAMES[number] | GridGameCode;

export const isPuzzleGame = (code: string): code is PuzzleGameCode => (PUZZLE_GAMES as readonly string[]).includes(code) || isGridGame(code);

// Range la grille dans la mémoire du jeu. Options : `daily` = date si la partie compte pour le classement du jour,
// `level` = numéro du niveau (mode Niveaux), `aid` = aide donnée quand elle ne se lit pas dans la grille
// (ex. numéros donnés en plus au Tracé)
export function startPuzzle(code: PuzzleGameCode, puzzle: unknown, {daily, level, aid = 0}: { daily?: string; level?: number; aid?: number } = {}): { gameId: string; grid: unknown } {
    const options = {...(daily ? {daily} : {}), ...(level ? {level} : {})};
    if (isGridGame(code)) {
        // aide = valeur du curseur de la partie libre
        const game = gridGame(code);
        const loaded = game.load(puzzle);
        return {gameId: game.store.create(loaded, aid, options), grid: game.view(loaded)};
    }
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
        case "TRACE": {
            const trace = puzzle as TracePuzzle;
            return {gameId: traceStore.create(trace, aid, options), grid: trace};
        }
        case "BINERO": {
            const grid = puzzle as BineroGrid;
            return {gameId: bineroStore.create(grid, countBineroClues(grid), options), grid: toApiGrid(grid)};
        }
    }
}

// Grille d'une partie gagnée il y a moins de 24 h (null si elle n'est plus en mémoire)
export function finishedPuzzle(code: PuzzleGameCode, gameId: string): unknown {
    if (isGridGame(code)) {
        const game = gridGame(code);
        const finished = game.store.getFinished(gameId);
        return finished ? game.save(finished.puzzle) : null;
    }
    const stores = {
        SUDOKU: sudokuStore, BINERO: bineroStore, RIKUDO: rikudoStore, TECTONIC: tectonicStore,
        GALAXIES: galaxiesStore, SHIKAKU: shikakuStore, QUEENS: queensStore, TRACE: traceStore,
    } as const;
    return stores[code].getFinished(gameId)?.puzzle ?? null;
}
