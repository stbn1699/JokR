import type {BineroGrid} from "./binero.js";
import {EMPTY} from "./binero.js";
import type {GalaxiesPuzzle} from "./galaxies.js";
import type {RikudoPuzzle} from "./rikudo.js";
import type {ShikakuPuzzle} from "./shikaku.js";
import type {TectonicPuzzle} from "./tectonic.js";
import type {TracePuzzle} from "./trace.js";
import type {ColoriaPuzzle} from "./coloria.js";
import type {TuyauxPuzzle} from "./tuyaux.js";
import type {LiensPuzzle} from "./liens.js";
import {type BouchonPuzzle, decodeParking} from "./bouchon.js";
import type {PaturagesPuzzle} from "./paturages.js";
import type {BouclePuzzle} from "./boucle.js";
import type {DevimotPuzzle} from "./devimot.js";
import type {EchellePuzzle} from "./echelle.js";
import type {MotsMelesPuzzle} from "./motsMeles.js";
import {type MotsACaserPuzzle, wordSlots} from "./motsACaser.js";
import type {WordLength} from "./words.js";

/*
 * Grilles du mode Niveaux écrites en une ligne de texte (fichiers *LevelData.ts, générés une fois pour toutes) :
 * une ligne par niveau, pour que 1000 niveaux restent lisibles et légers. Ici, la lecture de chaque format.
 */

const pairs = (text: string): [number, number][] =>
    text ? text.split(",").map(p => p.split("-").map(Number) as [number, number]) : [];

// 81 chiffres, ligne par ligne, 0 : case à remplir
export function decodeSudoku(line: string): number[][] {
    const cells = [...line].map(Number);
    return Array.from({length: 9}, (_, r) => cells.slice(r * 9, r * 9 + 9));
}

// chiffres 0 / 1 ligne par ligne, "." : case à remplir (grille carrée)
export function decodeBinero(line: string): BineroGrid {
    const size = Math.round(Math.sqrt(line.length));
    const cells = [...line].map(x => (x === "." ? EMPTY : Number(x)));
    return Array.from({length: size}, (_, r) => cells.slice(r * size, r * size + size));
}

// "<zone de chaque case, en base 36>:<nombre de chaque case, "." si vide>" (grille carrée)
export function decodeTectonic(line: string): TectonicPuzzle {
    const [regions, cells] = line.split(":") as [string, string];
    const size = Math.round(Math.sqrt(regions.length));
    return {
        width: size, height: size,
        regions: [...regions].map(c => parseInt(c, 36)),
        cells: [...cells].map(c => (c === "." ? null : Number(c))),
    };
}

// "<anneaux>:<nombre de chaque case, vide si à trouver, séparés par des virgules>:<points a-b>"
export function decodeRikudo(line: string): RikudoPuzzle {
    const [radius, cells, links] = line.split(":") as [string, string, string];
    return {radius: Number(radius), cells: cells.split(",").map(v => (v === "" ? null : Number(v))), links: pairs(links)};
}

// "<côté>:<cases des numéros 1, 2, 3…>:<murs a-b>"
export function decodeTrace(line: string): TracePuzzle {
    const [size, numbers, walls] = line.split(":") as [string, string, string];
    return {
        size: Number(size),
        numbers: numbers.split(",").map((cell, k) => ({cell: Number(cell), value: k + 1})),
        walls: pairs(walls),
    };
}

// "<côté>:<case.aire de chaque nombre>" (sans rectangle donné)
export function decodeShikaku(line: string): ShikakuPuzzle {
    const [size, clues] = line.split(":") as [string, string];
    const side = Number(size);
    return {
        width: side, height: side,
        clues: clues.split(",").map(c => {
            const [cell, area] = c.split(".").map(Number) as [number, number];
            return {cell, area};
        }),
        rects: [],
    };
}

// "<côté>:<centres l.c des galaxies, en demi-cases>" (sans mur donné)
export function decodeGalaxies(line: string): GalaxiesPuzzle {
    const [size, dots] = line.split(":") as [string, string];
    const side = Number(size);
    return {width: side, height: side, dots: dots.split(",").map(d => d.split(".").map(Number) as [number, number]), walls: []};
}

/* ---------- Jeux ajoutés depuis 3.3 (grilles sous la forme gardée en base, voir services/gridGames.ts) ---------- */

const LOOP_STEPS = "HDBG";

// Boucle : la solution en directions (H haut, D droite, B bas, G gauche) depuis la case 0
export function encodeLoop(loop: readonly number[], size: number): string {
    return loop.slice(1).map((cell, i) => {
        const diff = cell - loop[i]!;
        return LOOP_STEPS[diff === -size ? 0 : diff === 1 ? 1 : diff === size ? 2 : 3];
    }).join("");
}

export function decodeLoop(text: string, size: number): number[] {
    const loop = [0];
    for (const step of text) loop.push(loop[loop.length - 1]! + [-size, 1, size, -1][LOOP_STEPS.indexOf(step)]!);
    return loop;
}

const numbers = (text: string) => (text ? text.split(",").map(Number) : []);

// Coloria : une zone par caractère, jusqu'à 62 zones
export const ZONE_CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

// "<largeur>:<zone de chaque case, 0-9 a-z A-Z>:<couleur donnée de chaque zone, « . » à trouver>:<solution>" (3 couleurs)
export function decodeColoria(line: string): ColoriaPuzzle {
    const [width, regions, given, solution] = line.split(":") as [string, string, string, string];
    return {
        width: Number(width), zones: solution.length, colors: 3,
        regions: [...regions].map(c => ZONE_CHARS.indexOf(c)),
        given: [...given].map(c => (c === "." ? -1 : Number(c))),
        solution: [...solution].map(Number),
    };
}

// "<côté>:<pièce de départ de chaque case, hexadécimal>:<pièce de la solution>"
export function decodeTuyaux(line: string): TuyauxPuzzle {
    const [size, tiles, solution] = line.split(":") as [string, string, string];
    return {size: Number(size), tiles: [...tiles].map(c => parseInt(c, 16)), locked: [], solution: [...solution].map(c => parseInt(c, 16))};
}

// "<côté>:<chemin de chaque paire, cases séparées par des points>"
export function decodeLiens(line: string): LiensPuzzle {
    const [size, paths] = line.split(":") as [string, string];
    const solution = paths.split(",").map(path => path.split(".").map(Number));
    return {size: Number(size), pairs: solution.map(path => [path[0]!, path[path.length - 1]!]), solution};
}

// "<côté>:<coups de la solution la plus courte>:<véhicules, code de la banque>"
export function decodeBouchon(line: string): BouchonPuzzle {
    const [size, moves, code] = line.split(":") as [string, string, string];
    const vehicles = decodeParking(code);
    return {size: Number(size), exitRow: vehicles[0]!.row, vehicles, minMoves: Number(moves)};
}

// "<côté>:<case de chaque vache>:<carré de chaque vache, ligne.colonne.côté>"
export function decodePaturages(line: string): PaturagesPuzzle {
    const [size, cows, squares] = line.split(":") as [string, string, string];
    return {
        size: Number(size), cows: numbers(cows), given: [],
        solution: squares.split(",").map(s => {
            const [row, col, side] = s.split(".").map(Number) as [number, number, number];
            return {row, col, side};
        }),
    };
}

// "<côté>:<murs a-b>:<boucle de la solution>"
export function decodeBoucle(line: string): BouclePuzzle {
    const [size, walls, loop] = line.split(":") as [string, string, string];
    return {size: Number(size), walls: pairs(walls), solution: decodeLoop(loop, Number(size))};
}

// "<côté>:<case de départ>:<cases des mines>"
export function decodeDemineur(line: string): { size: number; mineCount: number; mines: number[]; start: number } {
    const [size, start, mines] = line.split(":") as [string, string, string];
    const list = numbers(mines);
    return {size: Number(size), mineCount: list.length, mines: list, start: Number(start)};
}

// "<mot sans accent>:<mot écrit>:<essais>"
export function decodeDevimot(line: string): DevimotPuzzle {
    const [secret, answer, attempts] = line.split(":") as [string, string, string];
    return {length: secret.length as WordLength, maxAttempts: Number(attempts), secret, answer, guesses: []};
}

// "<départ>:<arrivée>:<étapes>"
export function decodeEchelle(line: string): EchellePuzzle {
    const [start, target, par] = line.split(":") as [string, string, string];
    return {length: start.length as WordLength, start, target, par: Number(par)};
}

// "<côté>:<lettres ligne par ligne>:<mots>"
export function decodeMotsMeles(line: string): MotsMelesPuzzle {
    const [size, letters, words] = line.split(":") as [string, string, string];
    return {size: Number(size), letters, words: words.split(",")};
}

// "<côté>:<grille finie>:<numéros des emplacements déjà remplis (voir wordSlots)>"
export function decodeMotsACaser(line: string): MotsACaserPuzzle {
    const [size, solution, given] = line.split(":") as [string, string, string];
    const side = Number(size);
    const slots = wordSlots(solution, side);
    const shown = new Set(numbers(given).flatMap(k => slots[k]!));
    const cells = Array.from(solution, (letter, c) => (letter === "#" || shown.has(c) ? letter : ".")).join("");
    const words = slots.map(slot => slot.map(c => solution[c]).join("")).sort((a, b) => a.length - b.length || a.localeCompare(b));
    return {size: side, cells, words, solution};
}
