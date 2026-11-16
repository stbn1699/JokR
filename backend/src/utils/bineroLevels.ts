import {type BineroGrid, EMPTY} from "./binero.js";

/*
 * Niveaux du Binero (mode Niveaux) : grilles fixes, les mêmes pour tout le monde, de plus en plus difficiles.
 * Pour l'instant, les leçons du tutoriel guidé pas à pas (src/Components/Levels/BineroTutorial.tsx).
 * Leurs grilles sont choisies pour obliger à utiliser la leçon du niveau (voir src/Components/Levels/bineroGuide.ts) :
 * 1. pas trois à la suite : la paire (X X → l'autre chiffre autour) et le sandwich (X _ X → l'autre chiffre au milieu)
 * 2. autant de 0 que de 1 : une ligne qui a sa moitié d'un chiffre se complète avec l'autre
 * 3. pas deux lignes pareilles : une ligne à qui il manque deux chiffres se complète à l'envers de sa jumelle
 * Ne pas modifier une grille publiée : la progression des joueurs est enregistrée par numéro de niveau.
 */

export const BINERO_TUTORIAL = 3;

// "." : case à remplir
const grid = (rows: string[]): BineroGrid => rows.map(row => row.split(" ").map(x => (x === "." ? EMPTY : Number(x))));

export const BINERO_LEVELS: BineroGrid[] = [
    // 1 · 4×4 · pas trois à la suite
    grid([
        "1 . . 0",
        "0 . 0 1",
        ". 1 . .",
        ". . 0 .",
    ]),
    // 2 · 6×6 · autant de 0 que de 1
    grid([
        ". . . 0 1 0",
        ". . . . 1 .",
        "1 . . 1 . 1",
        ". 1 0 . 1 0",
        ". 0 1 1 . 1",
        ". 1 0 1 0 0",
    ]),
    // 3 · 6×6 · pas deux lignes pareilles
    grid([
        "1 0 0 . 1 0",
        "1 0 0 1 . .",
        "0 1 1 0 . .",
        "0 . 1 . . 1",
        ". . . . 1 0",
        "0 . . 0 . .",
    ]),
];
