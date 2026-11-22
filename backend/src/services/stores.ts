import {PuzzleStore} from "./PuzzleStore.js";
import type {BineroGrid} from "../utils/binero.js";
import type {RikudoPuzzle} from "../utils/rikudo.js";
import type {TectonicPuzzle} from "../utils/tectonic.js";
import type {GalaxiesPuzzle} from "../utils/galaxies.js";
import type {ShikakuPuzzle} from "../utils/shikaku.js";
import type {QueensPuzzle} from "../utils/queens.js";
import type {TracePuzzle} from "../utils/trace.js";
import type {DevimotPuzzle} from "../utils/devimot.js";
import type {EchellePuzzle} from "../utils/echelle.js";
import type {MotsMelesPuzzle} from "../utils/motsMeles.js";
import type {MotsACaserPuzzle} from "../utils/motsACaser.js";
import type {ColoriaPuzzle} from "../utils/coloria.js";
import type {TuyauxPuzzle} from "../utils/tuyaux.js";

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
// Tracé : cluesCount = nombre de numéros donnés en plus
export const traceStore = new PuzzleStore<TracePuzzle>();
// Jeux de mots : cluesCount = essais (Devimot), étapes (Échelle) ou mots à trouver (Mots mêlés)
export const devimotStore = new PuzzleStore<DevimotPuzzle>();
export const echelleStore = new PuzzleStore<EchellePuzzle>();
export const motsMelesStore = new PuzzleStore<MotsMelesPuzzle>();
// Mots à caser : cluesCount = mots déjà placés au départ
export const motsACaserStore = new PuzzleStore<MotsACaserPuzzle>();
// Coloria : cluesCount = nombre de couleurs
export const coloriaStore = new PuzzleStore<ColoriaPuzzle>();
// Tuyaux : cluesCount = cases données
export const tuyauxStore = new PuzzleStore<TuyauxPuzzle>();
