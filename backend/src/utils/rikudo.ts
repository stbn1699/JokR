/*
 * Moteur du Rikudo : plateau en nid d'abeille (hexagone de `radius` anneaux autour d'une case centrale vide).
 *
 * Règles :
 * 1. placer les nombres de 1 à N (N = nombre de cases) une fois chacun
 * 2. deux nombres qui se suivent sont dans des cases voisines (le chemin 1 → 2 → … → N est continu)
 * 3. un point (lien) entre deux cases impose que leurs nombres se suivent
 *
 * Les cases sont numérotées ligne par ligne (de haut en bas, de gauche à droite), sans la case centrale.
 * Coordonnées axiales (q, r) : la ligne r va de -radius à radius.
 */

export type RikudoBoard = {
    radius: number;
    size: number; // nombre de cases (N)
    coords: [number, number][];
    neighbors: number[][];
};

export type RikudoPuzzle = {
    radius: number;
    // Nombre donné par case (null = à trouver), dans l'ordre des cases du plateau
    cells: (number | null)[];
    // Liens entre deux cases voisines dont les nombres se suivent (indices de case, plus petit en premier)
    links: [number, number][];
};

const DIRECTIONS: [number, number][] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

const boards = new Map<number, RikudoBoard>();

export function rikudoBoard(radius: number): RikudoBoard {
    let board = boards.get(radius);
    if (board) return board;

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

    board = {radius, size: coords.length, coords, neighbors};
    boards.set(radius, board);
    return board;
}

// Nombre de cases pour un plateau de `radius` anneaux (sans la case centrale) : 36, 60, 90…
export const rikudoSize = (radius: number) => 3 * radius * (radius + 1);

function hexDistance(board: RikudoBoard, a: number, b: number): number {
    const [q1, r1] = board.coords[a]!, [q2, r2] = board.coords[b]!;
    const dq = q1 - q2, dr = r1 - r2;
    return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

export const areNeighbors = (board: RikudoBoard, a: number, b: number) => board.neighbors[a]!.includes(b);

function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
}

/**
 * Chemin aléatoire passant une fois par chaque case (path[v - 1] = case du nombre v).
 * Heuristique de Warnsdorff : on va vers la case voisine qui a le moins de sorties libres.
 */
export function randomPath(board: RikudoBoard): number[] {
    for (; ;) {
        const visited = new Array<boolean>(board.size).fill(false);
        const path = [Math.floor(Math.random() * board.size)];
        visited[path[0]!] = true;
        while (path.length < board.size) {
            const free = (c: number) => board.neighbors[c]!.filter(n => !visited[n]).length;
            const options = shuffle(board.neighbors[path.at(-1)!]!.filter(n => !visited[n]));
            if (options.length === 0) break;
            const next = options.reduce((best, c) => (free(c) < free(best) ? c : best));
            visited[next] = true;
            path.push(next);
        }
        if (path.length === board.size) return path;
    }
}

/**
 * Cherche les solutions d'une grille (chemins : path[v - 1] = case du nombre v).
 * S'arrête après `limit` solutions ou `maxNodes` étapes (alors `complete` est false).
 * Le nombre 1 doit être donné (point de départ de la recherche).
 */
export function solveRikudo(puzzle: RikudoPuzzle, limit = 2, maxNodes = 300_000) {
    const board = rikudoBoard(puzzle.radius);
    const n = board.size;
    const clue = puzzle.cells;
    const givenPos = new Array<number>(n + 2).fill(-1);
    clue.forEach((v, c) => {
        if (v !== null) givenPos[v] = c;
    });
    // Prochain nombre donné après v (0 s'il n'y en a plus)
    const nextGiven = new Array<number>(n + 2).fill(0);
    for (let v = n; v >= 1; v--) nextGiven[v] = givenPos[v + 1]! >= 0 ? v + 1 : nextGiven[v + 1]!;

    const linksOf: number[][] = Array.from({length: n}, () => []);
    for (const [a, b] of puzzle.links) {
        linksOf[a]!.push(b);
        linksOf[b]!.push(a);
    }

    const solutions: number[][] = [];
    const start = givenPos[1]!;
    if (start < 0) return {solutions, complete: false};

    const visited = new Array<boolean>(n).fill(false);
    const path: number[] = [start];
    let nodes = 0;
    let aborted = false;

    // Voisins encore libres d'une case (plus `tail`, la case où le chemin se trouve)
    const available = (c: number, tail: number) => {
        let count = 0;
        for (const m of board.neighbors[c]!) if (!visited[m] || m === tail) count++;
        return count;
    };

    const canPlace = (cell: number, value: number, prev: number): boolean => {
        if (visited[cell]) return false;
        const v = clue[cell];
        if (v !== null && v !== value) return false;
        // Liens de la case : chaque case liée est la précédente ou la suivante
        let others = 0;
        for (const linked of linksOf[cell]!) {
            if (linked === prev) continue;
            if (visited[linked]) return false;
            const lv = clue[linked];
            if (lv !== null && lv !== value + 1) return false;
            others++;
        }
        if (others > (value === n ? 0 : 1)) return false;
        // Le prochain nombre donné doit rester atteignable
        const g = nextGiven[value]!;
        if (g && hexDistance(board, cell, givenPos[g]!) > g - value) return false;
        return true;
    };

    // Après le passage par `prev` vers `cell` : aucune case libre ne doit être isolée,
    // et au plus une impasse (qui sera alors la fin du chemin)
    const noDeadEnd = (prev: number, cell: number): boolean => {
        let deadEnds = 0;
        for (const m of board.neighbors[prev]!) {
            if (visited[m]) continue;
            const free = available(m, cell);
            if (free === 0) return false;
            if (free === 1) {
                if (givenPos[n]! >= 0 && givenPos[n] !== m) return false;
                if (++deadEnds > 1) return false;
            }
        }
        return true;
    };

    const search = (value: number) => {
        if (solutions.length >= limit || aborted) return;
        if (++nodes > maxNodes) {
            aborted = true;
            return;
        }
        if (value === n) {
            solutions.push(path.slice());
            return;
        }
        const cell = path[value - 1]!;
        const prev = value > 1 ? path[value - 2]! : -1;

        // Case suivante imposée : nombre donné, ou lien vers une case pas encore visitée
        let candidates = board.neighbors[cell]!;
        const forced = givenPos[value + 1]!;
        if (forced >= 0) {
            if (!areNeighbors(board, cell, forced)) return;
            candidates = [forced];
        } else {
            const linked = linksOf[cell]!.find(l => l !== prev);
            if (linked !== undefined) candidates = [linked];
        }

        for (const next of candidates) {
            if (!canPlace(next, value + 1, cell)) continue;
            visited[next] = true;
            path.push(next);
            if (noDeadEnd(cell, next)) search(value + 1);
            path.pop();
            visited[next] = false;
            if (solutions.length >= limit || aborted) return;
        }
    };

    if (canPlace(start, 1, -1)) {
        visited[start] = true;
        search(1);
    }
    return {solutions, complete: !aborted};
}

/**
 * Génère une grille à solution unique avec `cluesCount` nombres donnés (1 et N toujours donnés).
 * Des liens sont ajoutés jusqu'à ce que la solution soit unique.
 * Renvoie null si la grille demande trop de liens ou si la recherche est trop longue (réessayer).
 */
export function generateRikudo(radius: number, cluesCount: number, maxLinks: number): RikudoPuzzle | null {
    const board = rikudoBoard(radius);
    const n = board.size;
    const path = randomPath(board);

    const givenValues = new Set([1, n]);
    for (const v of shuffle(Array.from({length: n - 2}, (_, i) => i + 2))) {
        if (givenValues.size >= cluesCount) break;
        givenValues.add(v);
    }
    const cells: (number | null)[] = new Array(n).fill(null);
    for (const v of givenValues) cells[path[v - 1]!] = v;

    const puzzle: RikudoPuzzle = {radius, cells, links: []};

    for (; ;) {
        const {solutions, complete} = solveRikudo(puzzle, 2);
        if (!complete) return null;
        const other = solutions.find(s => s.some((c, i) => c !== path[i]));
        if (!other) break;
        if (puzzle.links.length >= maxLinks) return null;

        // Lien de la vraie solution absent de l'autre solution trouvée (et pas déjà imposé par des nombres donnés)
        const otherPos = new Array<number>(n);
        other.forEach((c, i) => (otherPos[c] = i + 1));
        const candidates: [number, number][] = [];
        for (let v = 1; v < n; v++) {
            const a = path[v - 1]!, b = path[v]!;
            if (cells[a] !== null && cells[b] !== null) continue;
            if (Math.abs(otherPos[a]! - otherPos[b]!) === 1) continue;
            candidates.push(a < b ? [a, b] : [b, a]);
        }
        puzzle.links.push(candidates[Math.floor(Math.random() * candidates.length)]!);
    }
    return puzzle;
}

export const countRikudoClues = (puzzle: RikudoPuzzle) => puzzle.cells.filter(v => v !== null).length;

/**
 * true si `values` (un nombre par case) est une solution de la grille :
 * chaque nombre de 1 à N une fois, nombres consécutifs voisins, nombres donnés et liens respectés.
 */
export function isRikudoSolution(puzzle: RikudoPuzzle, values: unknown): values is number[] {
    const board = rikudoBoard(puzzle.radius);
    const n = board.size;
    if (!Array.isArray(values) || values.length !== n) return false;
    if (!values.every(v => Number.isInteger(v) && v >= 1 && v <= n)) return false;

    const position = new Array<number>(n + 1).fill(-1);
    for (let c = 0; c < n; c++) {
        const v = values[c] as number;
        if (position[v] !== -1) return false;
        position[v] = c;
        if (puzzle.cells[c] !== null && puzzle.cells[c] !== v) return false;
    }
    for (let v = 1; v < n; v++) {
        if (!areNeighbors(board, position[v]!, position[v + 1]!)) return false;
    }
    return puzzle.links.every(([a, b]) => Math.abs((values[a] as number) - (values[b] as number)) === 1);
}
