import {PuzzleStore} from "./PuzzleStore.js";
import type {BineroGrid} from "../utils/binero.js";
import type {RikudoPuzzle} from "../utils/rikudo.js";
import type {TectonicPuzzle} from "../utils/tectonic.js";
import type {GalaxiesPuzzle} from "../utils/galaxies.js";
import type {ShikakuPuzzle} from "../utils/shikaku.js";
import type {QueensPuzzle} from "../utils/queens.js";

/*
 * Parties en cours, une mémoire par jeu, partagées entre les routes du jeu
 * et celles du défi du jour (un défi se valide comme une partie normale).
 */
export const sudokuStore = new PuzzleStore<number[][]>();
export const bineroStore = new PuzzleStore<BineroGrid>();
export const rikudoStore = new PuzzleStore<RikudoPuzzle>();
export const tectonicStore = new PuzzleStore<TectonicPuzzle>();
// Galaxies : cluesCount = nombre de murs donnés en aide
export const galaxiesStore = new PuzzleStore<GalaxiesPuzzle>();
// Shikaku : cluesCount = nombre de rectangles donnés en aide
export const shikakuStore = new PuzzleStore<ShikakuPuzzle>();
// Queens : cluesCount = nombre de dames données en aide
export const queensStore = new PuzzleStore<QueensPuzzle>();
