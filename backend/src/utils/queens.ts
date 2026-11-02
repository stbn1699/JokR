/*
 * Moteur du Queens : grille N×N découpée en N zones de couleur.
 *
 * Règles : placer N dames
 * 1. une par ligne, une par colonne et une par zone
 * 2. deux dames ne se touchent jamais, même en diagonale
 *
 * Grille aplatie : index = ligne * N + colonne. regions[i] = numéro de zone de la case i.
 * Une solution est donnée par la colonne de la dame de chaque ligne.
 */

export type QueensPuzzle = {
    size: number;
    regions: number[];
    // Dames déjà placées au départ (aide), cases
    queens: number[];
};

function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
}

// Placement au hasard de N dames, une par ligne et par colonne, sans qu'elles se touchent
export function randomQueens(size: number): number[] | null {
    const cols: number[] = [];
    const used = new Set<number>();
    const place = (row: number): boolean => {
        if (row === size) return true;
        for (const c of shuffle(Array.from({length: size}, (_, k) => k))) {
            if (used.has(c) || (row > 0 && Math.abs(cols[row - 1]! - c) <= 1)) continue;
            cols.push(c);
            used.add(c);
            if (place(row + 1)) return true;
            cols.pop();
            used.delete(c);
        }
        return false;
    };
    return place(0) ? cols : null;
}

/*
 * Zones au hasard autour des dames : chaque zone part de sa dame et grandit d'une case voisine libre
 * à la fois, en tirant la zone au hasard (les petites zones grandissent un peu plus souvent).
 */
export function growRegions(size: number, cols: number[]): number[] {
    const n = size * size;
    const regions = Array<number>(n).fill(-1);
    cols.forEach((c, r) => (regions[r * size + c] = r));
    const sizes = Array<number>(size).fill(1);
    let free = n - size;
    const neighbors = (i: number) => {
        const r = Math.floor(i / size), c = i % size;
        return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
            .filter(([rr, cc]) => rr! >= 0 && rr! < size && cc! >= 0 && cc! < size)
            .map(([rr, cc]) => rr! * size + cc!);
    };
    while (free > 0) {
        // Zones qui peuvent encore grandir, la plus petite a plus de chances
        const options: { region: number; cell: number }[] = [];
        for (let i = 0; i < n; i++) {
            if (regions[i] === -1) continue;
            for (const nb of neighbors(i)) if (regions[nb] === -1) options.push({region: regions[i]!, cell: nb});
        }
        const weighted = options.flatMap(o => Array(Math.max(1, 6 - sizes[o.region]!)).fill(o));
        const pick = weighted[Math.floor(Math.random() * weighted.length)]!;
        if (regions[pick.cell] !== -1) continue;
        regions[pick.cell] = pick.region;
        sizes[pick.region]!++;
        free--;
    }
    return regions;
}

/*
 * Résout une grille : on place une dame par ligne, de haut en bas.
 * - count : nombre de solutions trouvées, au plus `limit`
 * - solution : colonne de la dame de chaque ligne (première solution trouvée)
 * Les dames données au départ sont imposées.
 */
export function solveQueens(puzzle: QueensPuzzle, limit = 2) {
    const {size, regions} = puzzle;
    const fixedCol = Array<number>(size).fill(-1);
    for (const q of puzzle.queens) fixedCol[Math.floor(q / size)] = q % size;
    const cols = Array<number>(size).fill(-1);
    const solutions: number[][] = [];

    // Masques de bits : colonnes et zones déjà prises
    const place = (row: number, usedCols: number, usedRegions: number): boolean => {
        if (row === size) {
            solutions.push(cols.slice());
            return solutions.length >= limit;
        }
        const prev = row > 0 ? cols[row - 1]! : -10;
        const base = row * size;
        for (let c = 0; c < size; c++) {
            if ((usedCols >> c) & 1) continue;
            if (c >= prev - 1 && c <= prev + 1) continue;
            if (fixedCol[row] !== -1 && fixedCol[row] !== c) continue;
            const region = regions[base + c]!;
            if ((usedRegions >> region) & 1) continue;
            cols[row] = c;
            if (place(row + 1, usedCols | (1 << c), usedRegions | (1 << region))) return true;
        }
        cols[row] = -1;
        return false;
    };
    place(0, 0, 0);
    return {count: solutions.length, solution: solutions[0] ?? null, solutions};
}

// true si la zone `region` reste d'un seul tenant sans la case `without`
function stillConnected(regions: number[], size: number, region: number, without: number): boolean {
    const cells = regions.flatMap((r, i) => (r === region && i !== without ? [i] : []));
    if (cells.length === 0) return false;
    const inside = new Set(cells);
    const seen = new Set([cells[0]!]);
    const stack = [cells[0]!];
    while (stack.length) {
        const i = stack.pop()!;
        const r = Math.floor(i / size), c = i % size;
        for (const nb of [r > 0 ? i - size : -1, r < size - 1 ? i + size : -1, c > 0 ? i - 1 : -1, c < size - 1 ? i + 1 : -1]) {
            if (nb >= 0 && inside.has(nb) && !seen.has(nb)) {
                seen.add(nb);
                stack.push(nb);
            }
        }
    }
    return seen.size === cells.length;
}

/*
 * Rend la solution unique en retouchant les zones. Tant qu'il existe une autre solution, on prend une de
 * ses dames qui n'est pas une dame de la vraie solution, et on passe sa case dans une zone voisine :
 * cette autre solution a alors deux dames dans la même zone, la vraie solution ne change pas.
 * Renvoie false si on ne trouve plus de case à déplacer.
 */
export function makeUnique(size: number, cols: number[], regions: number[], maxSteps = 300): boolean {
    const truth = new Set(cols.map((c, r) => r * size + c));
    for (let step = 0; step < maxSteps; step++) {
        const {solutions} = solveQueens({size, regions, queens: []}, 2);
        const other = solutions.find(sol => sol.some((c, r) => c !== cols[r]));
        if (!other) return solutions.length === 1;
        const moved = shuffle(other.map((c, r) => r * size + c).filter(q => !truth.has(q))).some(cell => {
            const r = Math.floor(cell / size), c = cell % size;
            const from = regions[cell]!;
            const targets = shuffle([r > 0 ? cell - size : -1, r < size - 1 ? cell + size : -1, c > 0 ? cell - 1 : -1, c < size - 1 ? cell + 1 : -1]
                .filter(nb => nb >= 0 && regions[nb] !== from).map(nb => regions[nb]!));
            if (targets.length === 0 || !stillConnected(regions, size, from, cell)) return false;
            regions[cell] = targets[0]!;
            return true;
        });
        if (!moved) return false;
    }
    return false;
}

/*
 * Grille à solution unique, puis `hints` dames de la solution données en aide.
 * On tire un placement de dames et des zones autour ; si la solution n'est pas unique, on recommence.
 */
export function generateQueens(size: number, hints: number, maxTries = 50_000): { puzzle: QueensPuzzle; solution: number[] } {
    for (let attempt = 0; attempt < maxTries; attempt++) {
        const cols = randomQueens(size);
        if (!cols) continue;
        const regions = growRegions(size, cols);
        if (!makeUnique(size, cols, regions)) continue;
        // Une zone d'une seule case donne sa dame tout de suite : au plus une par grille
        const zoneSizes = Array<number>(size).fill(0);
        for (const r of regions) zoneSizes[r]!++;
        if (zoneSizes.filter(z => z === 1).length > 1) continue;
        const queens = shuffle(cols.map((c, r) => r * size + c)).slice(0, hints).sort((a, b) => a - b);
        return {puzzle: {size, regions, queens}, solution: cols.map((c, r) => r * size + c)};
    }
    throw new Error(`Aucune grille de Queens ${size}×${size} à solution unique trouvée`);
}

// true si `queens` (cases des dames) résout la grille
export function isQueensSolution(puzzle: QueensPuzzle, queens: unknown): queens is number[] {
    const {size, regions} = puzzle;
    if (!Array.isArray(queens) || queens.length !== size) return false;
    if (!queens.every(q => Number.isInteger(q) && q >= 0 && q < size * size)) return false;
    const cells = queens as number[];
    const rows = new Set(cells.map(q => Math.floor(q / size)));
    const cols = new Set(cells.map(q => q % size));
    const zones = new Set(cells.map(q => regions[q]));
    if (rows.size !== size || cols.size !== size || zones.size !== size) return false;
    for (const a of cells) for (const b of cells) {
        if (a === b) continue;
        if (Math.abs(Math.floor(a / size) - Math.floor(b / size)) <= 1 && Math.abs((a % size) - (b % size)) <= 1) return false;
    }
    return puzzle.queens.every(q => cells.includes(q));
}
