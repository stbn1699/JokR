// Règles du Tuyaux côté navigateur : une pièce est un masque de ses sorties (1 haut, 2 droite, 4 bas, 8 gauche)
export const DIRECTIONS = [1, 2, 4, 8] as const;

const opposite = (bit: number) => (bit << 2 | bit >> 2) & 15;

export function rotateTile(mask: number, turns: number): number {
    const t = ((turns % 4) + 4) % 4;
    return ((mask << t) | (mask >> (4 - t))) & 15;
}

export function neighbour(cell: number, bit: number, size: number): number {
    const row = Math.floor(cell / size), col = cell % size;
    if (bit === 1) return row > 0 ? cell - size : -1;
    if (bit === 2) return col < size - 1 ? cell + 1 : -1;
    if (bit === 4) return row < size - 1 ? cell + size : -1;
    return col > 0 ? cell - 1 : -1;
}

// Cases reliées à `start` par des sorties qui se font face
export function connectedFrom(masks: readonly number[], size: number, start: number): Set<number> {
    const seen = new Set([start]);
    const stack = [start];
    while (stack.length) {
        const cell = stack.pop()!;
        for (const bit of DIRECTIONS) {
            if (!(masks[cell]! & bit)) continue;
            const next = neighbour(cell, bit, size);
            if (next >= 0 && masks[next]! & opposite(bit) && !seen.has(next)) {
                seen.add(next);
                stack.push(next);
            }
        }
    }
    return seen;
}

// Trajet de l'eau depuis la source : par quelle sortie elle entre dans chaque case (0 : la source) et en combien d'étapes
export type WaterStep = { entry: number; depth: number };

export function waterFlow(masks: readonly number[], size: number, source: number): Map<number, WaterStep> {
    const flow = new Map<number, WaterStep>();
    if (masks.length === 0) return flow;
    flow.set(source, {entry: 0, depth: 0});
    const queue = [source];
    for (let i = 0; i < queue.length; i++) {
        const cell = queue[i]!;
        const depth = flow.get(cell)!.depth;
        for (const bit of DIRECTIONS) {
            if (!(masks[cell]! & bit)) continue;
            const next = neighbour(cell, bit, size);
            if (next >= 0 && masks[next]! & opposite(bit) && !flow.has(next)) {
                flow.set(next, {entry: opposite(bit), depth: depth + 1});
                queue.push(next);
            }
        }
    }
    return flow;
}

// Remplissage d'une case : `delay` et `step` en ms ; delay null = déjà pleine, sans animation
export type WaterFill = { entry: number; delay: number | null; step: number };

const FILL_STEP_MS = 320;
// Une longue branche ne met pas plus de temps que ça à se remplir
const FILL_MAX_MS = 2400;
// L'eau attend que la pièce ait fini de tourner
const ROTATION_MS = 120;

// Garde les cases déjà pleines, et fait couler l'eau dans celles qui viennent d'être reliées
export function nextFills(previous: ReadonlyMap<number, WaterFill>, flow: ReadonlyMap<number, WaterStep>, instant: boolean): Map<number, WaterFill> {
    const added = [...flow].filter(([cell]) => !previous.has(cell));
    const depths = added.map(([, step]) => step.depth);
    const first = Math.min(...depths);
    const span = Math.max(...depths) - first + 1;
    const step = Math.min(FILL_STEP_MS, FILL_MAX_MS / span);

    const fills = new Map<number, WaterFill>();
    for (const [cell, water] of flow) {
        const kept = previous.get(cell);
        if (kept) fills.set(cell, kept);
        else fills.set(cell, {entry: water.entry, delay: instant ? null : ROTATION_MS + (water.depth - first) * step, step});
    }
    return fills;
}

// Cases dont une sortie ne débouche sur rien (bord de la grille ou voisine fermée de ce côté)
export function openEnds(masks: readonly number[], size: number): Set<number> {
    const out = new Set<number>();
    masks.forEach((mask, cell) => {
        for (const bit of DIRECTIONS) {
            if (!(mask & bit)) continue;
            const next = neighbour(cell, bit, size);
            if (next < 0 || !(masks[next]! & opposite(bit))) out.add(cell);
        }
    });
    return out;
}

// Nombre de liaisons complètes entre deux cases
function linkCount(masks: readonly number[], size: number): number {
    let links = 0;
    masks.forEach((mask, cell) => {
        for (const bit of [2, 4]) {
            if (!(mask & bit)) continue;
            const next = neighbour(cell, bit, size);
            if (next >= 0 && masks[next]! & opposite(bit)) links++;
        }
    });
    return links;
}

// Un seul réseau, sans boucle ni sortie ouverte
export function isSolved(masks: readonly number[], size: number): boolean {
    return masks.length > 0 && openEnds(masks, size).size === 0
        && linkCount(masks, size) === masks.length - 1
        && connectedFrom(masks, size, 0).size === masks.length;
}
