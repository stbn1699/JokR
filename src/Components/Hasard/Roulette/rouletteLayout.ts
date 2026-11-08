/*
 * Géométrie du tapis de la roulette, partagée par le grand tapis (RouletteTable) et le petit tapis des mises
 * de la table (LiveBets) : place de chaque case, et où dessiner le jeton d'une mise (milieu, bord ou coin).
 */

import type {CSSProperties} from "react";
import {
    cornerKey,
    rouletteColor,
    rouletteCorner,
    rouletteNeighbors,
    rouletteNumbers,
    splitKey,
} from "../../../../backend/src/utils/roulette.ts";

export type Place = { hr: string; hc: string; vr: string; vc: string };

export const OUTSIDE = [
    {key: "low", label: "1-18"},
    {key: "even", label: "Pair"},
    {key: "red", label: "Rouge"},
    {key: "black", label: "Noir"},
    {key: "odd", label: "Impair"},
    {key: "high", label: "19-36"},
];

export type Cell = { key: string; label: string; className: string; place: Place };

// Toutes les cases du tapis, avec leur place dans les deux dispositions
export const CELLS: Cell[] = [
    {key: "n:0", label: "0", className: "green", place: {hr: "1 / span 3", hc: "1", vr: "1", vc: "3 / span 3"}},
    ...Array.from({length: 36}, (_, i): Cell => {
        const n = i + 1;
        // horizontale : ligne du haut 3, 6… 36 ; verticale : 1, 2, 3 sur la première ligne
        return {
            key: `n:${n}`, label: String(n), className: rouletteColor(n),
            place: {hr: String(3 - (n - 1) % 3), hc: String(2 + Math.floor((n - 1) / 3)), vr: String(2 + Math.floor((n - 1) / 3)), vc: String(3 + (n - 1) % 3)},
        };
    }),
    ...[1, 2, 3].map((col): Cell => ({
        key: `column:${col}`, label: "2:1", className: "rt-out",
        place: {hr: String(4 - col), hc: "14", vr: "14", vc: String(2 + col)},
    })),
    ...[1, 2, 3].map((d): Cell => ({
        key: `dozen:${d}`, label: d === 1 ? "1-12" : d === 2 ? "13-24" : "25-36", className: "rt-out",
        place: {hr: "4", hc: `${2 + (d - 1) * 4} / span 4`, vr: `${2 + (d - 1) * 4} / span 4`, vc: "2"},
    })),
    ...OUTSIDE.map((o, i): Cell => ({
        key: o.key, label: o.label, className: `rt-out ${o.key === "red" ? "rt-red" : o.key === "black" ? "rt-black" : ""}`,
        place: {hr: "5", hc: `${2 + i * 2} / span 2`, vr: `${2 + i * 2} / span 2`, vc: "1"},
    })),
];

export type Dir = { x: number; y: number };

// Direction à l'écran d'un numéro vers son voisin `to` (ex. { x: 1, y: 0 } : à droite)
export function direction(from: number, to: number, vertical: boolean): Dir {
    if (to === 0) return vertical ? {x: 0, y: -1} : {x: -1, y: 0};
    const step = to - from;
    if (vertical) return step === 1 ? {x: 1, y: 0} : step === -1 ? {x: -1, y: 0} : step === 3 ? {x: 0, y: 1} : {x: 0, y: -1};
    return step === 3 ? {x: 1, y: 0} : step === -3 ? {x: -1, y: 0} : step === 1 ? {x: 0, y: -1} : {x: 0, y: 1};
}

// Voisin d'un numéro dans une direction de l'écran (null s'il n'y en a pas)
export function neighborToward(n: number, dir: Dir, vertical: boolean): number | null {
    for (const candidate of [n + 3, n - 3, n + 1, n - 1, 0]) {
        if (candidate === n || !rouletteNeighbors(n, candidate)) continue;
        const d = direction(n, candidate, vertical);
        if (d.x === dir.x && d.y === dir.y) return candidate;
    }
    return null;
}

// Part d'une case, depuis chaque bord, qui pose le jeton à cheval (au lieu du milieu)
const EDGE = 0.27;

// Mise visée en un point d'un numéro (x, y entre 0 et 1 dans la case) : le numéro, à cheval ou en carré
export function targetAt(n: number, x: number, y: number, vertical: boolean): string {
    const sx = x < EDGE ? -1 : x > 1 - EDGE ? 1 : 0;
    const sy = y < EDGE ? -1 : y > 1 - EDGE ? 1 : 0;
    const nx = sx ? neighborToward(n, {x: sx, y: 0}, vertical) : null;
    const ny = sy ? neighborToward(n, {x: 0, y: sy}, vertical) : null;
    if (nx && ny) {
        const first = Math.min(n, nx, ny, nx + ny - n);
        if (rouletteCorner(first)?.includes(nx + ny - n)) return cornerKey(first);
    }
    // près d'un coin sans carré possible (bord du tapis) : le côté le plus proche
    const preferX = Math.abs(x - 0.5) >= Math.abs(y - 0.5);
    const side = preferX ? (nx ?? ny) : (ny ?? nx);
    return side === null ? `n:${n}` : splitKey(n, side);
}

/*
 * Où dessiner le jeton d'une mise : dans quelle case (ancre) et vers quel bord ou coin de cette case.
 * Le jeton d'un numéro ou d'une mise extérieure est au milieu de sa propre case.
 */
export function anchorOf(key: string, vertical: boolean): { cell: string; dir: Dir } {
    const numbers = rouletteNumbers(key);
    if (!numbers || numbers.length === 1) return {cell: key, dir: {x: 0, y: 0}};
    if (numbers.length === 2) {
        const [a, b] = numbers as [number, number];
        // à cheval avec le zéro : dans le 1, 2 ou 3, du côté du zéro
        return a === 0 ? {cell: `n:${b}`, dir: direction(b, 0, vertical)} : {cell: `n:${a}`, dir: direction(a, b, vertical)};
    }
    const first = numbers[0]!;
    const right = direction(first, first + 3, vertical);
    const up = direction(first, first + 1, vertical);
    return {cell: `n:${first}`, dir: {x: right.x + up.x, y: right.y + up.y}};
}

// Position d'un jeton dans sa case ancre : au milieu, sur un bord ou sur un coin (`gap` : écart entre les cases, en px)
export const markerStyle = ({x, y}: Dir, gap = 4): CSSProperties => ({
    left: `calc(50% + ${x} * (50% + ${gap / 2}px))`,
    top: `calc(50% + ${y} * (50% + ${gap / 2}px))`,
});

export const numberOf = (key: string) => (key.startsWith("n:") ? Number(key.slice(2)) : null);
