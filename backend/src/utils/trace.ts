/*
 * Tracé : relier les numéros dans l'ordre (1, 2, 3…) par un seul chemin qui passe par toutes les cases de la
 * grille, une fois chacune, en allant d'une case à sa voisine (haut, bas, gauche, droite), sans traverser les murs.
 *
 * Génération :
 * 1. un chemin au hasard qui passe par toutes les cases (méthode « backbite » : on part d'un serpentin et on le
 *    déforme des milliers de fois en gardant un chemin valide)
 * 2. les numéros : le départ (1), l'arrivée et quelques étapes le long du chemin
 * 3. quelques murs entre des cases voisines que le chemin ne relie pas
 * 4. tant qu'un autre chemin résout aussi la grille, on ajoute un mur ou un numéro qui l'écarte :
 *    la grille finale n'a qu'une solution
 * Fichier partagé avec le site (vérification des règles pendant la partie) : le hasard est donné par l'appelant.
 */

export type TracePuzzle = {
    size: number;
    // numéros posés : case (index = ligne × taille + colonne) → valeur, dans l'ordre 1, 2, 3…
    numbers: { cell: number; value: number }[];
    // murs entre deux cases voisines [a, b] (a < b)
    walls: [number, number][];
};

type Random = (n: number) => number;

const wallKey = (a: number, b: number) => (a < b ? a * 1000 + b : b * 1000 + a);

// Cases voisines (haut, bas, gauche, droite)
export function traceNeighbours(size: number, cell: number): number[] {
    const r = Math.floor(cell / size), c = cell % size;
    const out: number[] = [];
    if (r > 0) out.push(cell - size);
    if (r < size - 1) out.push(cell + size);
    if (c > 0) out.push(cell - 1);
    if (c < size - 1) out.push(cell + 1);
    return out;
}

// Passages possibles depuis chaque case (voisines sans mur entre les deux)
function links(puzzle: Pick<TracePuzzle, "size" | "walls">): number[][] {
    const walls = new Set(puzzle.walls.map(([a, b]) => wallKey(a, b)));
    return Array.from({length: puzzle.size * puzzle.size}, (_, cell) =>
        traceNeighbours(puzzle.size, cell).filter(n => !walls.has(wallKey(cell, n))));
}

// ---------- Vérification

/**
 * Le chemin résout-il la grille ? Toutes les cases une fois, de case voisine en case voisine sans mur,
 * en partant du 1, en passant les numéros dans l'ordre et en finissant sur le dernier.
 */
export function isTraceSolution(puzzle: TracePuzzle, path: unknown): path is number[] {
    const total = puzzle.size * puzzle.size;
    if (!Array.isArray(path) || path.length !== total) return false;
    if (!path.every(c => Number.isInteger(c) && c >= 0 && c < total) || new Set(path).size !== total) return false;
    const open = links(puzzle);
    for (let i = 1; i < total; i++) if (!open[path[i - 1]]!.includes(path[i])) return false;
    const valueAt = new Map(puzzle.numbers.map(n => [n.cell, n.value]));
    let next = 1;
    for (const cell of path) {
        const v = valueAt.get(cell);
        if (v === undefined) continue;
        if (v !== next) return false;
        next++;
    }
    const last = Math.max(...puzzle.numbers.map(n => n.value));
    return next === last + 1 && valueAt.get(path[0]) === 1 && valueAt.get(path[total - 1]) === last;
}

// ---------- Solveur (compte les solutions, s'arrête à `limit`)

export type TraceSolve = { count: number; solutions: number[][]; complete: boolean };

/**
 * Cherche les chemins qui résolvent la grille (au plus `limit`), en s'arrêtant après `maxNodes` essais
 * (complete = false : recherche interrompue, le nombre de solutions n'est pas sûr).
 * Élagage : les cases restantes doivent rester d'un seul tenant, et une case qui n'a plus qu'une sortie ne
 * peut être que l'arrivée.
 */
export function solveTrace(puzzle: TracePuzzle, limit = 2, maxNodes = 200_000): TraceSolve {
    const total = puzzle.size * puzzle.size;
    const open = links(puzzle);
    const valueAt = new Int32Array(total);
    for (const n of puzzle.numbers) valueAt[n.cell] = n.value;
    const last = Math.max(...puzzle.numbers.map(n => n.value));
    const start = puzzle.numbers.find(n => n.value === 1)!.cell;
    const end = puzzle.numbers.find(n => n.value === last)!.cell;

    const visited = new Uint8Array(total);
    const path: number[] = [];
    const solutions: number[][] = [];
    let nodes = 0;
    let aborted = false;
    const stack = new Int32Array(total);
    const seen = new Uint8Array(total);

    // Les cases non visitées restent-elles atteignables depuis `cur`, sans impasse ailleurs qu'à l'arrivée ?
    const healthy = (cur: number, left: number): boolean => {
        seen.fill(0);
        let top = 0, reached = 0;
        for (const n of open[cur]!) {
            if (!visited[n] && !seen[n]) {
                seen[n] = 1;
                stack[top++] = n;
            }
        }
        let deadEnds = 0;
        while (top > 0) {
            const c = stack[--top]!;
            reached++;
            let exits = 0;
            for (const n of open[c]!) {
                if (n === cur) exits++;
                else if (!visited[n]) {
                    exits++;
                    if (!seen[n]) {
                        seen[n] = 1;
                        stack[top++] = n;
                    }
                }
            }
            if (exits <= 1 && c !== end) deadEnds++;
            if (deadEnds > 0) return false;
        }
        return reached === left;
    };

    const visit = (cell: number, nextValue: number) => {
        if (aborted || solutions.length >= limit) return;
        if (++nodes > maxNodes) {
            aborted = true;
            return;
        }
        visited[cell] = 1;
        path.push(cell);
        const v = valueAt[cell]!;
        const want = v ? v + 1 : nextValue;
        if (path.length === total) {
            if (cell === end) solutions.push([...path]);
        } else if (cell !== end && healthy(cell, total - path.length)) {
            for (const n of open[cell]!) {
                if (visited[n]) continue;
                const nv = valueAt[n]!;
                if (nv && nv !== want) continue;
                visit(n, want);
            }
        }
        path.pop();
        visited[cell] = 0;
    };

    visit(start, 2);
    return {count: solutions.length, solutions, complete: !aborted};
}

// ---------- Génération

// Chemin qui passe par toutes les cases, tiré au hasard (méthode backbite)
export function randomHamiltonianPath(size: number, random: Random): number[] {
    const path: number[] = [];
    for (let r = 0; r < size; r++) for (let k = 0; k < size; k++) path.push(r * size + (r % 2 ? size - 1 - k : k));
    const moves = size * size * 30;
    for (let m = 0; m < moves; m++) {
        // on retourne le chemin une fois sur deux pour déformer les deux bouts
        if (random(2)) path.reverse();
        const end = path[path.length - 1]!;
        const options = traceNeighbours(size, end).filter(n => n !== path[path.length - 2]);
        const n = options[random(options.length)]!;
        const i = path.indexOf(n);
        // relie le bout à sa voisine et retourne le morceau qui suit la voisine
        const tail = path.splice(i + 1).reverse();
        path.push(...tail);
    }
    return path;
}

// Grille d'un chemin : numéros aux positions données (triées) le long du chemin, et murs
function puzzleOf(size: number, path: number[], stops: number[], walls: [number, number][]): TracePuzzle {
    const sorted = [...new Set(stops)].sort((a, b) => a - b);
    const unique = new Map(walls.map(w => [wallKey(w[0], w[1]), w]));
    return {size, numbers: sorted.map((pos, i) => ({cell: path[pos]!, value: i + 1})), walls: [...unique.values()]};
}

/**
 * Nouvelle grille de `size` × `size`, avec `extra` numéros en plus de ceux qu'il faut pour n'avoir qu'une solution
 * (plus de numéros = plus facile). Renvoie aussi la solution.
 */
export function generateTrace(size: number, extra: number, random: Random): { puzzle: TracePuzzle; solution: number[] } {
    const total = size * size;
    for (; ;) {
        const path = randomHamiltonianPath(size, random);
        const onPath = new Set<number>();
        for (let i = 1; i < total; i++) onPath.add(wallKey(path[i - 1]!, path[i]!));

        // départ, arrivée, et des étapes réparties le long du chemin
        const stops = [0, total - 1];
        const base = Math.max(2, Math.round(size / 2));
        for (let k = 1; k <= base; k++) stops.push(Math.round(k * total / (base + 1)) + random(3) - 1);

        // quelques murs entre des cases voisines que le chemin ne relie pas
        const free: [number, number][] = [];
        for (let c = 0; c < total; c++) {
            for (const n of traceNeighbours(size, c)) if (c < n && !onPath.has(wallKey(c, n))) free.push([c, n]);
        }
        const walls: [number, number][] = [];
        for (let k = 0; k < Math.floor(size / 2) && free.length > 0; k++) walls.push(free.splice(random(free.length), 1)[0]!);

        // on écarte les autres solutions une à une
        let unique = false;
        for (let round = 0; round < total * 2; round++) {
            const solved = solveTrace(puzzleOf(size, path, stops, walls), 2);
            if (solved.complete && solved.count === 1) {
                unique = true;
                break;
            }
            const other = solved.solutions.find(s => s.some((c, i) => c !== path[i]));
            if (other && random(3) > 0) {
                // mur sur le premier pas où l'autre chemin quitte le bon : ce chemin-là ne marche plus
                const i = other.findIndex((c, k) => c !== path[k]);
                walls.push(other[i - 1]! < other[i]! ? [other[i - 1]!, other[i]!] : [other[i]!, other[i - 1]!]);
            } else {
                // recherche trop longue, ou une étape de plus : un numéro sur la première case où ça diverge
                const i = other ? other.findIndex((c, k) => c !== path[k]) : 1 + random(total - 2);
                stops.push(i);
            }
        }
        if (!unique) continue;

        // aide demandée : des numéros de plus, là où il n'y en a pas
        const taken = new Set(stops);
        const candidates = path.map((_, i) => i).filter(i => !taken.has(i));
        for (let k = 0; k < extra && candidates.length > 0; k++) stops.push(candidates.splice(random(candidates.length), 1)[0]!);

        return {puzzle: puzzleOf(size, path, stops, walls), solution: path};
    }
}

// Nombre de numéros posés (rangé avec les « cases données » des autres jeux dans les statistiques)
export const countTraceNumbers = (puzzle: TracePuzzle) => puzzle.numbers.length;
