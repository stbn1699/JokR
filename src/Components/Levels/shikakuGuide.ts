/*
 * Guide du tutoriel du Shikaku : déroule la résolution d'une grille comme le ferait un prof à côté du joueur.
 * Pour chaque nombre, on suit les rectangles encore possibles (bonne aire, aucun autre nombre dedans, pas sur un
 * rectangle déjà tracé ni sur une case réservée à un autre nombre).
 * Le plan est une suite d'étapes :
 * - "draw" : un nombre n'a plus qu'un rectangle possible, on le trace
 * - "cell" (technique) : une case libre n'est atteignable que par un seul nombre, elle lui est réservée
 * - "common" (technique) : des cases sont dans tous les rectangles possibles d'un nombre, elles lui sont réservées
 * Pur calcul (pas de navigateur) : utilisé aussi par les tests et les scripts de génération.
 */

export type ShikakuRect = [number, number, number, number];
export type ShikakuGuidePuzzle = { width: number; height: number; clues: { cell: number; area: number }[]; rects: ShikakuRect[] };

export type ShikakuTechnique = "cell" | "common";

export type ShikakuStep =
    | { kind: "draw"; clue: number; rect: ShikakuRect; cells: number[] }
    | { kind: "reserve"; why: ShikakuTechnique; clue: number; cells: number[]; spotlight: number[] };

const ALL: ShikakuTechnique[] = ["cell", "common"];

export function shikakuRectCells([r, c, h, w]: ShikakuRect, width: number): number[] {
    const cells: number[] = [];
    for (let dr = 0; dr < h; dr++) for (let dc = 0; dc < w; dc++) cells.push((r + dr) * width + c + dc);
    return cells;
}

// Rectangles d'aire `area` qui contiennent la case du nombre, dans la grille, sans autre nombre dedans
function candidates(p: ShikakuGuidePuzzle, clue: number): { rect: ShikakuRect; cells: number[] }[] {
    const {width, height, clues} = p;
    const {cell, area} = clues[clue]!;
    const others = new Set(clues.filter((_, i) => i !== clue).map(cl => cl.cell));
    const cr = Math.floor(cell / width), cc = cell % width;
    const out: { rect: ShikakuRect; cells: number[] }[] = [];
    for (let h = 1; h <= area; h++) {
        if (area % h !== 0) continue;
        const w = area / h;
        if (h > height || w > width) continue;
        for (let r = Math.max(0, cr - h + 1); r <= Math.min(cr, height - h); r++) {
            for (let c = Math.max(0, cc - w + 1); c <= Math.min(cc, width - w); c++) {
                const rect: ShikakuRect = [r, c, h, w];
                const cells = shikakuRectCells(rect, width);
                if (!cells.some(k => others.has(k))) out.push({rect, cells});
            }
        }
    }
    return out;
}

/**
 * Plan de résolution avec les techniques permises : les étapes dans l'ordre, et si la grille est entièrement découpée
 * à la fin (sinon il faut une technique plus avancée).
 */
export function planShikaku(p: ShikakuGuidePuzzle, allowed: ShikakuTechnique[] = ALL): { steps: ShikakuStep[]; solved: boolean } {
    const {width, height, clues} = p;
    const n = width * height;
    const all = clues.map((_, i) => candidates(p, i));
    // owner[k] : nombre qui couvre la case (rectangle tracé), reserved[k] : nombre à qui la case est réservée
    const owner = Array<number>(n).fill(-1);
    const reserved = Array<number>(n).fill(-1);
    const drawn = Array<boolean>(clues.length).fill(false);
    const steps: ShikakuStep[] = [];

    const draw = (i: number, rect: ShikakuRect, cells: number[]) => {
        drawn[i] = true;
        for (const k of cells) owner[k] = i;
        steps.push({kind: "draw", clue: i, rect, cells});
    };
    // rectangles donnés au départ
    for (const rect of p.rects) {
        const cells = shikakuRectCells(rect, width);
        const i = clues.findIndex(cl => cells.includes(cl.cell));
        if (i >= 0) {
            drawn[i] = true;
            for (const k of cells) owner[k] = i;
        }
    }

    const options = (i: number) => all[i]!.filter(o => o.cells.every(k => owner[k] === -1 && (reserved[k] === -1 || reserved[k] === i))
        && reserved.every((r, k) => r !== i || o.cells.includes(k)));

    for (let guard = 0; guard < 4 * n; guard++) {
        // 1. un nombre qui n'a plus qu'un rectangle possible
        const only = clues.findIndex((_, i) => !drawn[i] && options(i).length === 1);
        if (only >= 0) {
            const o = options(only)[0]!;
            draw(only, o.rect, o.cells);
            continue;
        }
        if (clues.every((_, i) => drawn[i])) break;

        // 2. des cases libres qu'un seul nombre peut atteindre (toutes celles du même nombre en une fois)
        let found = false;
        if (allowed.includes("cell")) {
            const reachOf = (k: number) => clues.flatMap((_, i) => (!drawn[i] && options(i).some(o => o.cells.includes(k)) ? [i] : []));
            const orphans = Array.from({length: n}, (_, k) => k).filter(k => owner[k] === -1 && reserved[k] === -1)
                .map(k => ({k, reach: reachOf(k)})).filter(x => x.reach.length === 1);
            if (orphans.length > 0) {
                const i = orphans[0]!.reach[0]!;
                const cells = orphans.filter(x => x.reach[0] === i).map(x => x.k);
                for (const k of cells) reserved[k] = i;
                steps.push({kind: "reserve", why: "cell", clue: i, cells, spotlight: [...cells, clues[i]!.cell]});
                found = true;
            }
        }
        if (found) continue;

        // 3. les cases communes à tous les rectangles possibles d'un nombre (utile seulement si ça gêne un autre nombre)
        if (allowed.includes("common")) {
            for (let i = 0; i < clues.length && !found; i++) {
                if (drawn[i]) continue;
                const opts = options(i);
                const common = opts[0]!.cells.filter(k => reserved[k] === -1 && opts.every(o => o.cells.includes(k)));
                if (common.length === 0) continue;
                const hinders = clues.some((_, j) => j !== i && !drawn[j] && options(j).some(o => o.cells.some(k => common.includes(k))));
                if (!hinders) continue;
                for (const k of common) reserved[k] = i;
                steps.push({kind: "reserve", why: "common", clue: i, cells: common, spotlight: [...new Set(opts.flatMap(o => o.cells))]});
                found = true;
            }
        }
        if (!found) break;
    }
    return {steps, solved: drawn.every(Boolean) && owner.every(o => o !== -1)};
}
