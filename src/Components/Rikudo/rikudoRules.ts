/*
 * Géométrie du plateau de Rikudo et détection des erreurs, côté navigateur.
 * Même ordre des cases que le serveur : lignes de haut en bas (r = -radius … radius),
 * de gauche à droite, sans la case centrale. Coordonnées axiales (q, r), hexagones "pointe en haut".
 */

export type HexBoard = {
    radius: number;
    size: number;
    coords: [number, number][];
    neighbors: number[][];
    // Centre de chaque case, en unités où un hexagone a un rayon de 1 (origine = centre du plateau)
    centers: [number, number][];
    // Dimensions totales du plateau dans ces unités
    width: number;
    height: number;
};

const DIRECTIONS: [number, number][] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const SQRT3 = Math.sqrt(3);
const boards = new Map<number, HexBoard>();

export function hexBoard(radius: number): HexBoard {
    const cached = boards.get(radius);
    if (cached) return cached;

    const coords: [number, number][] = [];
    for (let r = -radius; r <= radius; r++) {
        for (let q = Math.max(-radius, -r - radius); q <= Math.min(radius, -r + radius); q++) {
            if (q !== 0 || r !== 0) coords.push([q, r]);
        }
    }
    const index = new Map(coords.map(([q, r], i) => [`${q},${r}`, i]));
    const neighbors = coords.map(([q, r]) => DIRECTIONS
        .map(([dq, dr]) => index.get(`${q + dq},${r + dr}`))
        .filter((i): i is number => i !== undefined));
    const centers = coords.map(([q, r]) => [SQRT3 * (q + r / 2), 1.5 * r] as [number, number]);

    const board = {
        radius, size: coords.length, coords, neighbors, centers,
        width: SQRT3 * (2 * radius + 1),
        height: 3 * radius + 2,
    };
    boards.set(radius, board);
    return board;
}

export type HexDirection = "left" | "right" | "up" | "down";

/**
 * Case vers laquelle se déplacer au clavier : gauche / droite dans la ligne,
 * haut / bas vers la case la plus proche de la ligne voisine. Les cases refusées par `canStop` sont sautées.
 */
export function nextHexCell(board: HexBoard, from: number, direction: HexDirection, canStop: (i: number) => boolean): number | null {
    const [fx, fy] = board.centers[from]!;
    let best: number | null = null;
    let bestScore = Infinity;
    for (let i = 0; i < board.size; i++) {
        if (i === from || !canStop(i)) continue;
        const [x, y] = board.centers[i]!;
        const dx = x - fx, dy = y - fy;
        let score: number;
        if (direction === "left" || direction === "right") {
            if (Math.abs(dy) > 0.01 || (direction === "left" ? dx >= 0 : dx <= 0)) continue;
            score = Math.abs(dx);
        } else {
            if (direction === "up" ? dy >= -0.01 : dy <= 0.01) continue;
            // Ligne la plus proche d'abord, puis la case la plus proche horizontalement
            score = Math.abs(dy) * 100 + Math.abs(dx);
        }
        if (score < bestScore) {
            bestScore = score;
            best = i;
        }
    }
    return best;
}

/**
 * Cases en erreur (option "Montrer les erreurs") :
 * - un nombre présent deux fois
 * - deux nombres qui se suivent, posés dans des cases non voisines
 * - un point entre deux cases remplies dont les nombres ne se suivent pas
 */
export function rikudoConflicts(board: HexBoard, values: (number | null)[], links: [number, number][]): Set<number> {
    const conflicts = new Set<number>();
    const cellsOf = new Map<number, number[]>();
    values.forEach((v, c) => {
        if (v === null) return;
        cellsOf.set(v, [...(cellsOf.get(v) ?? []), c]);
    });

    for (const [v, cells] of cellsOf) {
        if (cells.length > 1) cells.forEach(c => conflicts.add(c));
        const next = cellsOf.get(v + 1);
        if (!next || cells.length > 1 || next.length > 1) continue;
        const a = cells[0]!, b = next[0]!;
        if (!board.neighbors[a]!.includes(b)) {
            conflicts.add(a);
            conflicts.add(b);
        }
    }

    for (const [a, b] of links) {
        const va = values[a], vb = values[b];
        if (va !== null && va !== undefined && vb !== null && vb !== undefined && Math.abs(va - vb) !== 1) {
            conflicts.add(a);
            conflicts.add(b);
        }
    }
    return conflicts;
}

/**
 * Morceaux du chemin déjà tracé : suites de nombres consécutifs posés dans des cases voisines
 * (chaque morceau = liste de cases dans l'ordre des nombres). Un nombre posé deux fois coupe le chemin.
 */
export function pathRuns(values: (number | null)[], neighbors: number[][]): number[][] {
    const cellOf = new Map<number, number>();
    const duplicates = new Set<number>();
    values.forEach((v, c) => {
        if (v === null) return;
        if (cellOf.has(v)) duplicates.add(v);
        cellOf.set(v, c);
    });
    const runs: number[][] = [];
    let run: number[] = [];
    for (let v = 1; v <= values.length; v++) {
        const a = cellOf.get(v), b = cellOf.get(v + 1);
        const linked = a !== undefined && b !== undefined && !duplicates.has(v) && !duplicates.has(v + 1)
            && neighbors[a]!.includes(b);
        if (linked) {
            if (run.length === 0) run.push(a);
            run.push(b);
        } else if (run.length > 0) {
            runs.push(run);
            run = [];
        }
    }
    return runs;
}
