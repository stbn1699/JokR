import type {Rect, ShikakuPuzzle} from "../../Models/shikaku.model.ts";

/*
 * Règles du Shikaku, côté navigateur. Grille aplatie (index = ligne * largeur + colonne),
 * rectangle = [ligne, colonne, hauteur, largeur].
 */

export function rectCells([r, c, h, w]: Rect, width: number): number[] {
    const cells: number[] = [];
    for (let dr = 0; dr < h; dr++) for (let dc = 0; dc < w; dc++) cells.push((r + dr) * width + c + dc);
    return cells;
}

// Rectangle qui va de la case a à la case b (dans n'importe quel sens)
export function rectBetween(a: number, b: number, width: number): Rect {
    const ra = Math.floor(a / width), ca = a % width, rb = Math.floor(b / width), cb = b % width;
    return [Math.min(ra, rb), Math.min(ca, cb), Math.abs(ra - rb) + 1, Math.abs(ca - cb) + 1];
}

export const sameRect = (a: Rect, b: Rect) => a.every((v, i) => v === b[i]);

export function rectsOverlap(a: Rect, b: Rect): boolean {
    return a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
}

export type RectStatus = "valid" | "error";

export type ShikakuAnalysis = {
    // Pour chaque rectangle tracé (donnés puis posés) : valide si un seul nombre dedans, égal à son aire
    statuses: RectStatus[];
    // Numéro du nombre contenu, -1 sinon
    clueOf: number[];
    // Numéro du nombre de chaque case si la grille est résolue, sinon null
    solution: number[] | null;
};

/**
 * Juge les rectangles tracés. La grille est résolue quand toutes les cases sont couvertes
 * et que tous les rectangles sont valides.
 */
export function analyzeRects(puzzle: ShikakuPuzzle, rects: Rect[]): ShikakuAnalysis {
    const {width, height, clues} = puzzle;
    const clueAt = new Map(clues.map((cl, i) => [cl.cell, i]));
    const owner = Array<number>(width * height).fill(-1);
    const statuses: RectStatus[] = [];
    const clueOf: number[] = [];

    rects.forEach((rect, k) => {
        const cells = rectCells(rect, width);
        const inside = cells.flatMap(cell => (clueAt.has(cell) ? [clueAt.get(cell)!] : []));
        const valid = inside.length === 1 && clues[inside[0]!]!.area === cells.length;
        statuses.push(valid ? "valid" : "error");
        clueOf.push(inside.length === 1 ? inside[0]! : -1);
        for (const cell of cells) owner[cell] = k;
    });

    const solved = statuses.every(s => s === "valid") && owner.every(o => o !== -1);
    const solution = solved ? owner.map(k => clueOf[k]!) : null;
    return {statuses, clueOf, solution};
}
