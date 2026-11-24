import type {ColoriaPuzzle} from "./coloria.js";
import {rotateTile, type TuyauxPuzzle} from "./tuyaux.js";
import type {LiensPuzzle} from "./liens.js";
import type {BouchonPuzzle, BouchonVehicle} from "./bouchon.js";
import type {PaturagesPuzzle} from "./paturages.js";
import type {BouclePuzzle} from "./boucle.js";
import type {DevimotPuzzle} from "./devimot.js";
import type {EchellePuzzle} from "./echelle.js";
import type {MotsMelesPuzzle} from "./motsMeles.js";
import type {MotsACaserPuzzle} from "./motsACaser.js";

/*
 * Leçons du tutoriel guidé des jeux ajoutés depuis 3.3 (les 3 premiers niveaux de leur mode Niveaux).
 * Les grilles sont rangées sous la forme gardée en base (voir services/gridGames.ts) ; chacune est construite pour
 * obliger à utiliser la technique de sa leçon, et a une seule solution quand le jeu en a besoin (voir levels.test.ts).
 * Les étapes de chaque leçon (ce que dit la bulle, les cases qui brillent) sont dans src/Components/Lessons/.
 * Ne pas modifier une leçon publiée : la progression des joueurs est enregistrée par numéro de niveau.
 */

// Coloria : 1. la règle (une zone qui touche déjà deux couleurs) 2. la chaîne 3. le duo (deux voisines qui touchent
// la même couleur prennent les deux autres)
export const COLORIA_LESSONS: ColoriaPuzzle[] = [
    {width: 4, zones: 5, colors: 3, regions: [0, 0, 1, 1, 0, 2, 2, 1, 3, 2, 2, 4, 3, 3, 4, 4], given: [0, 1, -1, -1, -1], solution: [0, 1, 2, 1, 0]},
    {
        width: 5, zones: 7, colors: 3,
        regions: [0, 0, 1, 1, 1, 0, 2, 2, 1, 3, 4, 2, 2, 3, 3, 4, 4, 4, 5, 3, 6, 6, 6, 5, 5],
        given: [0, 1, -1, -1, -1, -1, -1], solution: [0, 1, 2, 0, 1, 2, 0],
    },
    {
        width: 6, zones: 8, colors: 3,
        regions: [0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 1, 1, 1, 2, 2, 2, 3, 4, 4, 4, 4, 5, 3, 3, 4, 4, 5, 5, 6, 6, 6, 7, 7, 7],
        given: [0, -1, -1, -1, -1, -1, 1, -1], solution: [0, 1, 2, 2, 0, 1, 1, 2],
    },
];

// Pièces de départ : chaque pièce de la solution tournée d'un, deux ou trois quarts de tour
const scramble = (solution: number[]) => solution.map((mask, cell) => rotateTile(mask, 1 + cell % 3));
const tuyaux = (size: number, solution: number[]): TuyauxPuzzle => ({size, tiles: scramble(solution), locked: [], solution});

// Tuyaux : 1. le bord (pas de sortie vers l'extérieur) 2. les bouts (deux bouts ne se font jamais face)
// 3. pas de boucle
export const TUYAUX_LESSONS: TuyauxPuzzle[] = [
    tuyaux(3, [6, 14, 8, 1, 7, 12, 2, 9, 1]),
    tuyaux(4, [6, 10, 10, 12, 7, 14, 12, 5, 5, 1, 5, 5, 3, 8, 1, 1]),
    tuyaux(5, [4, 6, 8, 4, 4, 7, 11, 12, 5, 5, 1, 2, 11, 13, 5, 6, 10, 12, 7, 13, 1, 2, 11, 9, 1]),
];

// Liens : 1. relier les paires 2. les coins 3. remplir toute la grille
export const LIENS_LESSONS: LiensPuzzle[] = [
    {size: 4, pairs: [[5, 7], [11, 6], [0, 9]], solution: [[5, 1, 2, 3, 7], [11, 15, 14, 10, 6], [0, 4, 8, 12, 13, 9]]},
    {
        size: 5, pairs: [[7, 14], [19, 8], [15, 12], [6, 16]],
        solution: [[7, 2, 3, 4, 9, 14], [19, 24, 23, 18, 13, 8], [15, 20, 21, 22, 17, 12], [6, 1, 0, 5, 10, 11, 16]],
    },
    {
        size: 6, pairs: [[9, 21], [15, 28], [18, 8], [34, 5], [7, 24]],
        solution: [[9, 3, 4, 10, 16, 22, 21], [15, 14, 20, 26, 32, 33, 27, 28], [18, 12, 6, 0, 1, 2, 8], [34, 35, 29, 23, 17, 11, 5], [7, 13, 19, 25, 31, 30, 24]],
    },
];

const H = (row: number, col: number, length = 2): BouchonVehicle => ({row, col, length, horizontal: true});
const V = (row: number, col: number, length = 2): BouchonVehicle => ({row, col, length, horizontal: false});

// Bouchon (le véhicule 0 est le taxi) : 1. libérer la route 2. faire de la place 3. la chaîne de véhicules
export const BOUCHON_LESSONS: BouchonPuzzle[] = [
    {size: 6, exitRow: 2, vehicles: [H(2, 0), V(1, 3)], minMoves: 2},
    {size: 6, exitRow: 2, vehicles: [H(2, 1), V(1, 4, 3), H(4, 2, 3), H(0, 3, 3)], minMoves: 3},
    {size: 6, exitRow: 2, vehicles: [H(2, 0), V(0, 3, 3), H(3, 2), V(3, 1), V(3, 4), H(5, 3, 3), V(1, 5)], minMoves: 6},
];

// Pâturages : 1. une vache par carré 2. les vaches serrées (carrés 1×1) 3. le grand carré
export const PATURAGES_LESSONS: PaturagesPuzzle[] = [
    {
        size: 4, cows: [5, 2, 8, 15], given: [],
        solution: [{row: 0, col: 0, side: 2}, {row: 0, col: 2, side: 2}, {row: 2, col: 0, side: 2}, {row: 2, col: 2, side: 2}],
    },
    {
        size: 5, cows: [11, 4, 14, 16, 17, 22, 23, 24], given: [],
        solution: [
            {row: 0, col: 0, side: 3}, {row: 0, col: 3, side: 2}, {row: 2, col: 3, side: 2}, {row: 3, col: 0, side: 2},
            {row: 3, col: 2, side: 1}, {row: 4, col: 2, side: 1}, {row: 4, col: 3, side: 1}, {row: 4, col: 4, side: 1},
        ],
    },
    {
        size: 6, cows: [1, 11, 22, 24, 25, 33, 34, 30, 31], given: [],
        solution: [
            {row: 0, col: 0, side: 4}, {row: 0, col: 4, side: 2}, {row: 2, col: 4, side: 2}, {row: 4, col: 0, side: 1}, {row: 4, col: 1, side: 1},
            {row: 4, col: 2, side: 2}, {row: 4, col: 4, side: 2}, {row: 5, col: 0, side: 1}, {row: 5, col: 1, side: 1},
        ],
    },
];

// Boucle : 1. les coins 2. les murs (une case qui n'a plus que deux sorties) 3. pas de petite boucle
export const BOUCLE_LESSONS: BouclePuzzle[] = [
    {size: 4, walls: [[6, 10], [1, 5]], solution: [0, 1, 2, 3, 7, 6, 5, 9, 10, 11, 15, 14, 13, 12, 8, 4]},
    {
        size: 6, walls: [[28, 34], [26, 27], [23, 29], [18, 19], [9, 15], [20, 21], [19, 20], [9, 10]],
        solution: [0, 1, 2, 3, 9, 8, 7, 13, 19, 25, 26, 20, 14, 15, 16, 10, 4, 5, 11, 17, 23, 22, 21, 27, 28, 29, 35, 34, 33, 32, 31, 30, 24, 18, 12, 6],
    },
    {
        size: 6, walls: [[19, 20], [8, 9], [22, 28], [2, 8], [20, 26], [11, 17]],
        solution: [0, 1, 2, 3, 4, 5, 11, 10, 9, 15, 16, 17, 23, 22, 21, 20, 14, 8, 7, 13, 19, 25, 26, 27, 28, 29, 35, 34, 33, 32, 31, 30, 24, 18, 12, 6],
    },
];

// Démineur (forme gardée en base : les mines et la case de départ, déjà ouverte) : 1. les drapeaux et les cases sûres
// 2. la chaîne 3. le motif 1-1 (deux nombres qui partagent leurs cases cachées)
export const DEMINEUR_LESSONS = [
    {size: 5, mineCount: 2, mines: [3, 9], start: 20},
    {size: 6, mineCount: 4, mines: [0, 5, 23, 32], start: 14},
    {size: 6, mineCount: 3, mines: [31, 34, 4], start: 14},
];

const devimot = (length: 4 | 5, secret: string): DevimotPuzzle => ({length, maxAttempts: 6, secret, answer: secret.toLowerCase(), guesses: []});

// Devimot : 1. les couleurs 2. garder les indices 3. les lettres en double
export const DEVIMOT_LESSONS: DevimotPuzzle[] = [devimot(4, "LOUP"), devimot(5, "TIGRE"), devimot(5, "POMME")];

// Échelle : 1. une lettre à la fois 2. plusieurs chemins 3. le détour (une lettre change deux fois)
export const ECHELLE_LESSONS: EchellePuzzle[] = [
    {length: 4, start: "PAIN", target: "SOIN", par: 2},
    {length: 4, start: "LOUP", target: "JOUR", par: 3},
    {length: 5, start: "TIGRE", target: "LEVRE", par: 4},
];

// Mots mêlés, aux tailles du jeu : 1. 8×8, horizontal et vertical 2. 10×10, en diagonale 3. 12×12, à l'envers
export const MOTS_MELES_LESSONS: MotsMelesPuzzle[] = [
    {size: 8, letters: "DEREMTTASCHATUAEODTPBSDSUOUVUELBRSXMRDOASNCEETUFLIONLOPMUUENUGRT", words: ["CHAT", "LION", "LOUP", "OURS"]},
    {
        size: 10,
        letters: "DVACHEMILELDRQIMCOOETSLHSMCUIEPISAATKRICEGSRPDKSSHNIBCRIBTPIOALAUSNMLEEJNNNBIAVNSEKENMSOEERCUICHEVAL",
        words: ["CHEVAL", "CHIEN", "LAPIN", "OURS", "RENARD", "VACHE"],
    },
    {
        size: 12,
        letters: "IARBREGAVCDSJALDUSRUELFXSCONUHFRBAONNEBIUTEVDIETUSOSUNYUATSUAPULUOEETAJLGOUOZQEIRCEOEOZECQPIGBOYAXOIPNMSDEMFEUUUSUSTAPDOUXGLESOLEILILOIPSHOETEAE",
        words: ["ARBRE", "FLEUR", "NEIGE", "NUAGE", "OMBRE", "PLUIE", "SOLEIL"],
    },
];

// Mots à caser : grille de départ (« # » case noire, « . » à remplir), à partir de la grille finie
const caser = (size: number, solution: string, words: string[]): MotsACaserPuzzle =>
    ({size, cells: solution.replace(/[A-Z]/g, "."), words, solution});

// Mots à caser : 1. les longueurs 2. les croisements 3. tous de la même longueur
export const MOTS_A_CASER_LESSONS: MotsACaserPuzzle[] = [
    caser(5, "##M##PLAGER#I##E#N#######", ["PRE", "MAIN", "PLAGE"]),
    caser(4, "CHAT#E#R#R#OLOUP", ["CHAT", "HERO", "LOUP", "TROP"]),
    caser(5, "SALONA###EPARMII###GNAPPE", ["NAPPE", "NEIGE", "PARMI", "SALON", "SAPIN"]),
];
