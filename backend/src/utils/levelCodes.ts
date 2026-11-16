import type {BineroGrid} from "./binero.js";
import {EMPTY} from "./binero.js";
import type {GalaxiesPuzzle} from "./galaxies.js";
import type {RikudoPuzzle} from "./rikudo.js";
import type {ShikakuPuzzle} from "./shikaku.js";
import type {TectonicPuzzle} from "./tectonic.js";
import type {TracePuzzle} from "./trace.js";

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
