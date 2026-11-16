import type {GalaxiesPuzzle} from "./galaxies.js";
import {GALAXIES_LEVEL_DATA} from "./galaxiesLevelData.js";
import {decodeGalaxies} from "./levelCodes.js";

/*
 * Niveaux des Galaxies (mode Niveaux) : grilles fixes, les mêmes pour tout le monde, de plus en plus difficiles.
 * Les GALAXIES_TUTORIAL premiers niveaux sont les leçons du tutoriel guidé pas à pas (src/Components/Levels/GalaxiesTutorial.tsx).
 * Les grilles des leçons sont choisies pour obliger à utiliser la leçon du niveau (voir src/Components/Levels/galaxiesGuide.ts) :
 * 1. les bases : chaque case touche un point, il suffit de tracer les murs entre galaxies différentes
 * 2. le miroir : un point ne prend pas une case dont la symétrique sort de la grille ou est déjà ailleurs
 * 3. la case enfermée : un point ne prend pas une case qu'il ne peut pas atteindre
 * Points en coordonnées doublées [ligne, colonne] (le centre de la case (r, c) est [2r+1, 2c+1]), rangés dans l'ordre
 * de lecture (le guide fait tracer les galaxies dans cet ordre).
 * Ne pas modifier une grille publiée : la progression des joueurs est enregistrée par numéro de niveau.
 */

export const GALAXIES_TUTORIAL = 3;

// Leçons du tutoriel (grilles choisies pour obliger à utiliser leur technique)
const GALAXIES_LESSONS: GalaxiesPuzzle[] = [
    // 1 · 4×4 · les bases (un point au centre d'une case, au milieu d'un côté, sur un coin)
    {width: 4, height: 4, dots: [[1, 7], [2, 1], [2, 4], [3, 7], [6, 2], [6, 6]], walls: []},
    // 2 · 5×5 · le miroir
    {width: 5, height: 5, dots: [[1, 5], [2, 3], [2, 8], [6, 1], [6, 4], [6, 8], [9, 6]], walls: []},
    // 3 · 4×4 · la case enfermée
    {width: 4, height: 4, dots: [[1, 4], [4, 1], [4, 4], [4, 7], [7, 3], [7, 5]], walls: []},
];

export const GALAXIES_LEVELS: GalaxiesPuzzle[] = [...GALAXIES_LESSONS, ...GALAXIES_LEVEL_DATA.map(decodeGalaxies)];
