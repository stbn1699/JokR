/*
 * Moteur du Shikaku (aussi appelé Rectangles) : grille avec des nombres.
 *
 * Règles : découper la grille en rectangles (ou carrés) tels que chaque rectangle contienne
 * exactement un nombre, et que ce nombre soit son aire (son nombre de cases).
 *
 * Grille aplatie : index = ligne * largeur + colonne. Un rectangle = [ligne, colonne, hauteur, largeur].
 */

export type Rect = [number, number, number, number];

export type Clue = {
    // Case du nombre
    cell: number;
    // Aire du rectangle qui le contient
    area: number;
};

export type ShikakuPuzzle = {
    width: number;
    height: number;
    clues: Clue[];
    // Rectangles déjà tracés au départ (aide), un par nombre concerné
    rects: Rect[];
};

function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
}

export const rectCells = ([r, c, h, w]: Rect, width: number): number[] => {
    const cells: number[] = [];
    for (let dr = 0; dr < h; dr++) for (let dc = 0; dc < w; dc++) cells.push((r + dr) * width + c + dc);
    return cells;
};

/*
 * Découpage au hasard en rectangles d'aire 2 à maxArea (une case seule seulement si rien d'autre ne rentre).
 * On remplit la première case libre (ligne par ligne) avec un rectangle tiré parmi ceux qui tiennent.
 */
export function randomRects(width: number, height: number, maxArea: number): Rect[] {
    const free = Array<boolean>(width * height).fill(true);
    const rects: Rect[] = [];
    for (let start = 0; start < width * height; start++) {
        if (!free[start]) continue;
        const r = Math.floor(start / width), c = start % width;
        // Largeur libre sur la ligne de départ
        let maxW = 0;
        while (c + maxW < width && free[r * width + c + maxW]) maxW++;
        const options: Rect[] = [];
        for (let w = 1; w <= maxW; w++) {
            for (let h = 1; r + h <= height; h++) {
                if (w * h > maxArea) break;
                // La ligne du bas doit être libre sur toute la largeur
                let ok = true;
                for (let dc = 0; dc < w; dc++) if (!free[(r + h - 1) * width + c + dc]) ok = false;
                if (!ok) break;
                if (w * h >= 2) options.push([r, c, h, w]);
            }
        }
        // Préfère les rectangles moyens : poids = aire, mais pas trop allongés
        const weighted = options.flatMap(o => {
            const area = o[2] * o[3];
            const ratio = Math.max(o[2], o[3]) / Math.min(o[2], o[3]);
            return Array<Rect>(Math.max(1, Math.round(area / ratio))).fill(o);
        });
        const rect = weighted.length ? weighted[Math.floor(Math.random() * weighted.length)]! : [r, c, 1, 1] as Rect;
        for (const cell of rectCells(rect, width)) free[cell] = false;
        rects.push(rect);
    }
    return rects;
}

// Tous les rectangles possibles pour un nombre : bonne aire, dans la grille, sans autre nombre dedans
function candidatesFor(clue: Clue, width: number, height: number, clueAt: Int32Array): Rect[] {
    const out: Rect[] = [];
    const cr = Math.floor(clue.cell / width), cc = clue.cell % width;
    for (let h = 1; h <= clue.area; h++) {
        if (clue.area % h !== 0) continue;
        const w = clue.area / h;
        if (h > height || w > width) continue;
        for (let r = Math.max(0, cr - h + 1); r <= Math.min(cr, height - h); r++) {
            for (let c = Math.max(0, cc - w + 1); c <= Math.min(cc, width - w); c++) {
                const rect: Rect = [r, c, h, w];
                if (rectCells(rect, width).every(k => clueAt[k] === -1 || k === clue.cell)) out.push(rect);
            }
        }
    }
    return out;
}

/*
 * Résout une grille (couverture exacte) : chaque nombre choisit un de ses rectangles possibles,
 * sans chevauchement, jusqu'à couvrir toute la grille. On traite d'abord la case la moins couverte.
 * Les rectangles donnés au départ sont imposés.
 */
export function solveShikaku(puzzle: ShikakuPuzzle, limit = 2, maxNodes = 50_000) {
    const {width, height, clues} = puzzle;
    const n = width * height;
    const clueAt = new Int32Array(n).fill(-1);
    clues.forEach((cl, i) => (clueAt[cl.cell] = i));

    // Rectangles possibles de chaque nombre, sous forme de listes de cases
    const given = new Map<number, Rect>();
    for (const rect of puzzle.rects) {
        const inside = rectCells(rect, width).map(k => clueAt[k]).filter(i => i !== -1);
        if (inside.length === 1) given.set(inside[0]!, rect);
    }
    const options = clues.map((cl, i) => {
        const g = given.get(i);
        return (g ? [g] : candidatesFor(cl, width, height, clueAt)).map(rect => ({rect, cells: rectCells(rect, width)}));
    });

    const owner = new Int32Array(n).fill(-1);
    const chosen: (Rect | null)[] = clues.map(() => null);
    let count = 0, nodes = 0;
    let solution: number[] | null = null;

    const fits = (cells: number[]) => cells.every(k => owner[k] === -1);

    const search = (): boolean => {
        if (++nodes > maxNodes) return true;
        // Nombre pas encore placé qui a le moins de rectangles encore possibles
        let best = -1, bestFits: { rect: Rect; cells: number[] }[] = [];
        for (let i = 0; i < clues.length; i++) {
            if (chosen[i]) continue;
            const ok = options[i]!.filter(o => fits(o.cells));
            if (ok.length === 0) return false;
            if (best === -1 || ok.length < bestFits.length) {
                best = i;
                bestFits = ok;
                if (ok.length === 1) break;
            }
        }
        if (best === -1) {
            // Tous les nombres placés : la grille doit être entièrement couverte
            if (owner.some(o => o === -1)) return false;
            count++;
            if (!solution) solution = Array.from(owner);
            return count >= limit;
        }
        for (const o of bestFits) {
            for (const k of o.cells) owner[k] = best;
            chosen[best] = o.rect;
            const stop = search();
            for (const k of o.cells) owner[k] = -1;
            chosen[best] = null;
            if (stop) return true;
        }
        return false;
    };

    // Les aires doivent couvrir exactement la grille
    if (clues.reduce((s, cl) => s + cl.area, 0) !== n) return {count: 0, solution: null, aborted: false};
    search();
    return {count, solution: solution as number[] | null, aborted: nodes > maxNodes};
}

/*
 * Grille à solution unique, puis `hints` rectangles de la solution donnés en aide.
 * Pour chaque découpage tiré, on essaie plusieurs places pour les nombres avant d'en tirer un autre.
 */
export function generateShikaku(width: number, height: number, hints: number, maxArea: number): { puzzle: ShikakuPuzzle; solution: Rect[] } {
    for (; ;) {
        const rects = randomRects(width, height, maxArea);
        // Une case seule est un nombre « 1 » sans intérêt : on retire ces découpages
        if (rects.some(([, , h, w]) => h * w === 1)) continue;
        for (let placement = 0; placement < 8; placement++) {
            const clues: Clue[] = rects.map(rect => {
                const cells = rectCells(rect, width);
                return {cell: cells[Math.floor(Math.random() * cells.length)]!, area: cells.length};
            });
            const {count, aborted} = solveShikaku({width, height, clues, rects: []}, 2);
            if (count === 1 && !aborted) {
                const order = shuffle(rects.map((_, i) => i)).slice(0, hints);
                const sortedClues = clues.map((cl, i) => ({cl, rect: rects[i]!})).sort((a, b) => a.cl.cell - b.cl.cell);
                const hintSet = new Set(order.map(i => rects[i]));
                return {
                    puzzle: {
                        width, height,
                        clues: sortedClues.map(x => x.cl),
                        rects: sortedClues.filter(x => hintSet.has(x.rect)).map(x => x.rect),
                    },
                    solution: sortedClues.map(x => x.rect),
                };
            }
        }
    }
}

/*
 * true si `regions` (numéro du nombre de chaque case) est une solution : chaque numéro couvre
 * exactement un rectangle qui contient son nombre et a la bonne aire, et les rectangles donnés sont respectés.
 */
export function isShikakuSolution(puzzle: ShikakuPuzzle, regions: unknown): regions is number[] {
    const {width, height, clues} = puzzle;
    const n = width * height;
    if (!Array.isArray(regions) || regions.length !== n) return false;
    if (!regions.every(v => Number.isInteger(v) && v >= 0 && v < clues.length)) return false;
    const cells = regions as number[];

    for (let i = 0; i < clues.length; i++) {
        const members = cells.flatMap((v, k) => (v === i ? [k] : []));
        if (members.length !== clues[i]!.area || cells[clues[i]!.cell] !== i) return false;
        const rows = members.map(k => Math.floor(k / width)), cols = members.map(k => k % width);
        const r = Math.min(...rows), c = Math.min(...cols);
        const h = Math.max(...rows) - r + 1, w = Math.max(...cols) - c + 1;
        // Rectangle plein : sa boîte englobante a exactement l'aire attendue
        if (h * w !== members.length) return false;
    }
    // Rectangles donnés : chacun est bien une pièce de la solution
    return puzzle.rects.every(rect => {
        const inside = rectCells(rect, width);
        const id = cells[inside[0]!];
        return inside.every(k => cells[k] === id) && inside.length === cells.filter(v => v === id).length;
    });
}
