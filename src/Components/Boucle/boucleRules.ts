import type {BouclePuzzle} from "../../Models/boucle.model.ts";

/*
 * Le tracé est un ensemble de liens entre cases voisines : on peut dessiner plusieurs morceaux puis les raccorder.
 * Un lien est stocké comme un nombre : plus petite case × nombre de cases + plus grande case.
 */

export const linkKey = (a: number, b: number, size: number) => Math.min(a, b) * size * size + Math.max(a, b);
export const linkCells = (key: number, size: number): [number, number] => [Math.floor(key / (size * size)), key % (size * size)];

const touches = (key: number, cell: number, size: number) => linkCells(key, size).includes(cell);
const incident = (links: readonly number[], cell: number, size: number) => links.filter(key => touches(key, cell, size));

const isNextTo = (a: number, b: number, size: number) =>
    Math.abs(Math.floor(a / size) - Math.floor(b / size)) + Math.abs(a % size - b % size) === 1;

export const wallKeys = (puzzle: BouclePuzzle) => new Set(puzzle.walls.map(([a, b]) => linkKey(a, b, puzzle.size)));

// Un geste : il dessine, ou il efface s'il commence sur un lien déjà tracé
export type Stroke = {
    head: number;
    links: number[];
    mode: "draw" | "erase" | null;
    // liens ajoutés par ce geste et ceux qu'ils ont coupés, pour tout rendre si on revient en arrière
    added: { key: number; cut: number[] }[];
    // dernier lien parcouru
    via: number | null;
};

export const startStroke = (links: readonly number[], cell: number): Stroke =>
    ({head: cell, links: [...links], mode: null, added: [], via: null});

// Une case n'a que deux liens : pour en poser un troisième, on retire un ancien lien
function linkToCut(links: readonly number[], cell: number, stroke: Stroke, size: number): number | undefined {
    const around = incident(links, cell, size);
    if (around.length < 2) return undefined;
    const mine = new Set(stroke.added.map(entry => entry.key));
    return around.find(key => key !== stroke.via && !mine.has(key)) ?? around.find(key => key !== stroke.via);
}

function step(puzzle: BouclePuzzle, walls: Set<number>, stroke: Stroke, next: number): Stroke | null {
    const {size} = puzzle;
    if (!isNextTo(stroke.head, next, size)) return null;
    const key = linkKey(stroke.head, next, size);
    if (walls.has(key)) return null;
    const exists = stroke.links.includes(key);
    const mode = stroke.mode ?? (exists ? "erase" : "draw");

    if (mode === "erase") {
        return {...stroke, mode, head: next, via: key, links: stroke.links.filter(link => link !== key)};
    }

    const last = stroke.added[stroke.added.length - 1];
    if (last?.key === key) {
        const links = [...stroke.links.filter(link => link !== key), ...last.cut];
        const added = stroke.added.slice(0, -1);
        return {...stroke, mode, head: next, links, added, via: added[added.length - 1]?.key ?? null};
    }
    if (exists) return {...stroke, mode, head: next, via: key};

    const cut: number[] = [];
    let links = stroke.links;
    for (const cell of [stroke.head, next]) {
        const removed = linkToCut(links, cell, stroke, size);
        if (removed !== undefined) {
            cut.push(removed);
            links = links.filter(link => link !== removed);
        }
    }
    return {...stroke, mode, head: next, via: key, links: [...links, key], added: [...stroke.added, {key, cut}]};
}

// Suit le doigt jusqu'à `target`, case par case, même s'il a sauté plusieurs cases entre deux événements
export function strokeTo(puzzle: BouclePuzzle, stroke: Stroke, target: number): Stroke {
    const {size} = puzzle;
    const walls = wallKeys(puzzle);
    let current = stroke;
    for (let guard = 0; guard < size * 2 + 2 && current.head !== target; guard++) {
        const dRow = Math.floor(target / size) - Math.floor(current.head / size);
        const dCol = target % size - current.head % size;
        const vertical = dRow !== 0 ? current.head + Math.sign(dRow) * size : null;
        const horizontal = dCol !== 0 ? current.head + Math.sign(dCol) : null;
        const options = Math.abs(dRow) >= Math.abs(dCol) ? [vertical, horizontal] : [horizontal, vertical];
        let next: Stroke | null = null;
        for (const option of options) {
            if (option !== null && !next) next = step(puzzle, walls, current, option);
        }
        if (!next) break;
        current = next;
    }
    return current;
}

// Cases qui ont leurs deux liens
export function fullCells(links: readonly number[], size: number): number {
    const degree = new Uint8Array(size * size);
    for (const key of links) for (const cell of linkCells(key, size)) degree[cell]!++;
    return degree.reduce((sum, value) => sum + (value === 2 ? 1 : 0), 0);
}

// Nombre de boucles fermées quand toutes les cases ont leurs deux liens
export function countLoops(links: readonly number[], size: number): number {
    const total = size * size;
    if (fullCells(links, size) !== total) return 0;
    const around = Array.from({length: total}, () => [] as number[]);
    for (const key of links) {
        const [a, b] = linkCells(key, size);
        around[a]!.push(b);
        around[b]!.push(a);
    }
    const seen = new Uint8Array(total);
    let loops = 0;
    for (let cell = 0; cell < total; cell++) {
        if (seen[cell]) continue;
        loops++;
        const stack = [cell];
        while (stack.length) {
            const at = stack.pop()!;
            if (seen[at]) continue;
            seen[at] = 1;
            stack.push(...around[at]!);
        }
    }
    return loops;
}

// La boucle dans l'ordre si le tracé est gagnant, sinon null
export function solvedLoop(puzzle: BouclePuzzle, links: readonly number[]): number[] | null {
    const {size} = puzzle;
    const total = size * size;
    if (links.length !== total || countLoops(links, size) !== 1) return null;
    const walls = wallKeys(puzzle);
    if (links.some(key => walls.has(key))) return null;
    const loop = [0];
    let previous = -1, current = 0;
    while (loop.length < total) {
        const [a, b] = incident(links, current, size).map(key => {
            const [x, y] = linkCells(key, size);
            return x === current ? y : x;
        });
        const next = a === previous ? b! : a!;
        previous = current;
        current = next;
        loop.push(current);
    }
    return loop;
}

// Reprise d'une partie : seuls les liens encore possibles sont gardés
export function cleanLinks(puzzle: BouclePuzzle, saved: unknown): number[] {
    if (!Array.isArray(saved)) return [];
    const {size} = puzzle;
    const walls = wallKeys(puzzle);
    return [...new Set(saved)].filter((key): key is number => {
        if (!Number.isInteger(key) || key < 0) return false;
        const [a, b] = linkCells(key, size);
        return a < size * size && isNextTo(a, b, size) && !walls.has(key);
    });
}
