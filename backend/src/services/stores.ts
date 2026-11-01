import {PuzzleStore} from "./PuzzleStore.js";
import type {BineroGrid} from "../utils/binero.js";

/*
 * Parties en cours, une mémoire par jeu, partagées entre les routes du jeu
 * et celles du défi du jour (un défi se valide comme une partie normale).
 */
export const sudokuStore = new PuzzleStore<number[][]>();
export const bineroStore = new PuzzleStore<BineroGrid>();
