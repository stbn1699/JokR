import {
    BOUCHON_LESSONS, BOUCLE_LESSONS, COLORIA_LESSONS, DEMINEUR_LESSONS, DEVIMOT_LESSONS, ECHELLE_LESSONS, LIENS_LESSONS,
    MOTS_A_CASER_LESSONS, MOTS_MELES_LESSONS, PATURAGES_LESSONS, TUYAUX_LESSONS,
} from "./gridLessons.js";
import {
    decodeBouchon, decodeBoucle, decodeColoria, decodeDemineur, decodeDevimot, decodeEchelle, decodeLiens, decodeMotsACaser,
    decodeMotsMeles, decodePaturages, decodeTuyaux,
} from "./levelCodes.js";
import {COLORIA_LEVEL_DATA} from "./coloriaLevelData.js";
import {TUYAUX_LEVEL_DATA} from "./tuyauxLevelData.js";
import {LIENS_LEVEL_DATA} from "./liensLevelData.js";
import {BOUCHON_LEVEL_DATA} from "./bouchonLevelData.js";
import {PATURAGES_LEVEL_DATA} from "./paturagesLevelData.js";
import {BOUCLE_LEVEL_DATA} from "./boucleLevelData.js";
import {DEMINEUR_LEVEL_DATA} from "./demineurLevelData.js";
import {DEVIMOT_LEVEL_DATA} from "./devimotLevelData.js";
import {ECHELLE_LEVEL_DATA} from "./echelleLevelData.js";
import {MOTS_MELES_LEVEL_DATA} from "./motsMelesLevelData.js";
import {MOTS_A_CASER_LEVEL_DATA} from "./motsACaserLevelData.js";

/*
 * Niveaux des jeux ajoutés depuis 3.3 (mode Niveaux) : 1000 grilles fixes par jeu, les mêmes pour tout le monde.
 * Niveaux 1 à 3 : les leçons du tutoriel guidé (gridLessons.ts) ; niveaux 4 à 1000 : générés une fois pour toutes par
 * scripts/build-grid-levels.ts (une ligne par niveau dans <jeu>LevelData.ts), du plus doux au plus dur. Les premiers
 * n'utilisent que les techniques du tutoriel (voir gridLevelGuides.ts).
 * Les grilles sont sous la forme gardée en base (voir services/gridGames.ts).
 * Ne pas modifier une grille publiée : la progression des joueurs est enregistrée par numéro de niveau.
 */

export const GRID_TUTORIAL = 3;

export const COLORIA_LEVELS = [...COLORIA_LESSONS, ...COLORIA_LEVEL_DATA.map(decodeColoria)];
export const TUYAUX_LEVELS = [...TUYAUX_LESSONS, ...TUYAUX_LEVEL_DATA.map(decodeTuyaux)];
export const LIENS_LEVELS = [...LIENS_LESSONS, ...LIENS_LEVEL_DATA.map(decodeLiens)];
export const BOUCHON_LEVELS = [...BOUCHON_LESSONS, ...BOUCHON_LEVEL_DATA.map(decodeBouchon)];
export const PATURAGES_LEVELS = [...PATURAGES_LESSONS, ...PATURAGES_LEVEL_DATA.map(decodePaturages)];
export const BOUCLE_LEVELS = [...BOUCLE_LESSONS, ...BOUCLE_LEVEL_DATA.map(decodeBoucle)];
export const DEMINEUR_LEVELS = [...DEMINEUR_LESSONS, ...DEMINEUR_LEVEL_DATA.map(decodeDemineur)];
export const DEVIMOT_LEVELS = [...DEVIMOT_LESSONS, ...DEVIMOT_LEVEL_DATA.map(decodeDevimot)];
export const ECHELLE_LEVELS = [...ECHELLE_LESSONS, ...ECHELLE_LEVEL_DATA.map(decodeEchelle)];
export const MOTS_MELES_LEVELS = [...MOTS_MELES_LESSONS, ...MOTS_MELES_LEVEL_DATA.map(decodeMotsMeles)];
export const MOTS_A_CASER_LEVELS = [...MOTS_A_CASER_LESSONS, ...MOTS_A_CASER_LEVEL_DATA.map(decodeMotsACaser)];
