/*
 * Guide du tutoriel du Tracé : fait avancer le chemin pas à pas depuis le 1, comme le ferait un prof à côté du
 * joueur, tant que la case suivante est forcée.
 * - "only" : depuis le bout du chemin, une seule case libre est atteignable (les autres sont prises, derrière un mur
 *   ou hors de la grille)
 * - "order" (technique) : les autres cases libres sont des numéros qui ne sont pas encore à leur tour
 * - "deadend" (technique) : une case voisine n'a plus, à part le bout du chemin, qu'une seule voisine libre :
 *   si on n'y va pas maintenant, elle deviendra un cul-de-sac
 * Pur calcul (pas de navigateur) : utilisé aussi par les tests et les scripts de génération.
 */

export type TraceGuidePuzzle = { size: number; numbers: { cell: number; value: number }[]; walls: [number, number][] };

export type TraceRule = "only" | "order" | "deadend";

export type TraceStep = {
    rule: TraceRule;
    // case où avancer, depuis le bout du chemin `from`
    cell: number;
    from: number;
    // cases à mettre en lumière (pour comprendre)
    spotlight: number[];
};

const ALL: TraceRule[] = ["only", "order", "deadend"];

const wallKey = (a: number, b: number) => (a < b ? a * 1000 + b : b * 1000 + a);

function neighbours(size: number, cell: number): number[] {
    const r = Math.floor(cell / size), c = cell % size;
    const out: number[] = [];
    if (r > 0) out.push(cell - size);
    if (r < size - 1) out.push(cell + size);
    if (c > 0) out.push(cell - 1);
    if (c < size - 1) out.push(cell + 1);
    return out;
}

/**
 * Prochain pas forcé depuis le bout du chemin (seulement parmi les règles `allowed`), ou null s'il n'y en a pas
 * (chemin fini, ou il faut une technique plus avancée).
 */
export function nextTraceStep(p: TraceGuidePuzzle, path: number[], allowed: TraceRule[] = ALL): TraceStep | null {
    const {size, numbers} = p;
    const total = size * size;
    if (path.length === 0 || path.length >= total) return null;
    const walls = new Set(p.walls.map(([a, b]) => wallKey(a, b)));
    const valueAt = new Map(numbers.map(n => [n.cell, n.value]));
    const last = Math.max(...numbers.map(n => n.value));
    const lastCell = numbers.find(n => n.value === last)!.cell;
    const visited = new Set(path);
    const end = path[path.length - 1]!;
    // prochain numéro attendu
    const reached = Math.max(0, ...path.map(c => valueAt.get(c) ?? 0));
    const open = (from: number) => neighbours(size, from).filter(n => !visited.has(n) && !walls.has(wallKey(from, n)));
    const inTurn = (cell: number) => !valueAt.has(cell) || valueAt.get(cell) === reached + 1;
    // l'arrivée n'est prise qu'en dernier
    const allowedNext = (cell: number) => inTurn(cell) && (cell !== lastCell || path.length === total - 1);

    const free = open(end);
    if (allowed.includes("only") && free.length === 1 && allowedNext(free[0]!)) {
        return {rule: "only", cell: free[0]!, from: end, spotlight: [end, free[0]!]};
    }

    const fitting = free.filter(allowedNext);
    if (allowed.includes("order") && free.length > 1 && fitting.length === 1) {
        return {rule: "order", cell: fitting[0]!, from: end, spotlight: [end, ...free]};
    }

    if (allowed.includes("deadend")) {
        // une voisine libre (autre que l'arrivée) qui n'a plus qu'une autre sortie : il faut y aller maintenant
        const trapped = fitting.filter(n => n !== lastCell && open(n).length <= 1);
        if (trapped.length === 1) {
            const n = trapped[0]!;
            return {rule: "deadend", cell: n, from: end, spotlight: [end, n, ...open(n)]};
        }
    }
    return null;
}

// Avance tant que les règles permises suffisent : règles utilisées, chemin, et si le chemin est complet
export function solveTraceWithGuide(p: TraceGuidePuzzle, allowed: TraceRule[] = ALL): { rules: TraceRule[]; solved: boolean; path: number[] } {
    const start = p.numbers.find(n => n.value === 1)!.cell;
    const path = [start];
    const rules: TraceRule[] = [];
    for (let guard = 0; guard < p.size * p.size; guard++) {
        const step = nextTraceStep(p, path, allowed);
        if (!step) break;
        rules.push(step.rule);
        path.push(step.cell);
    }
    return {rules, solved: path.length === p.size * p.size, path};
}
