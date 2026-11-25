import type {BouclePuzzle} from "../../Models/boucle.model.ts";
import {linkCells, linkKey, wallKeys} from "../Boucle/boucleRules.ts";

/*
 * Guide du tutoriel de Boucle, comme ceux des jeux d'origine (Levels/*Guide.ts) : à chaque moment, la déduction la plus
 * simple, avec les traits qu'elle impose (montrés en pointillés) et les cases qui l'expliquent.
 * - corner : un coin n'a que deux voisines, la boucle passe par les deux
 * - wall : un mur (ou le bord) ne laisse que deux sorties à la case
 * - full : une voisine a déjà ses deux traits, la boucle ne peut plus y entrer
 * - loop : la voisine est l'autre bout du même morceau, les relier fermerait une petite boucle
 * - trap : aller vers la voisine forcerait, de proche en proche (règles ci-dessus), une impasse : une case coincée
 *   (`stuck`) ou une petite boucle (`closes`)
 * - wrong : un trait qui n'est pas dans la boucle (à effacer)
 * - next : plus de déduction, le trait suivant de la solution
 */

export type BoucleRule = "corner" | "wall" | "full" | "loop" | "trap" | "wrong" | "next";

export type BoucleStep = {
    rule: BoucleRule;
    // case dont on parle
    cell: number;
    // traits à tracer (ou, pour wrong, à effacer)
    links: number[];
    // cases en lumière : la case et ses voisines
    spotlight: number[];
    // voisine où la boucle ne peut pas aller (full, loop, trap)
    blocked: number | null;
    // trap : traits qu'il faudrait tracer avant d'en arriver là, puis la case qui se retrouverait coincée,
    // ou la petite boucle qu'ils fermeraient
    chain?: number[];
    stuck?: number;
    closes?: boolean;
};

// Voisines d'une case qui ne sont ni hors du plateau ni derrière un mur
export function boucleExits(puzzle: BouclePuzzle, cell: number, walls = wallKeys(puzzle)): number[] {
    const {size} = puzzle;
    const row = Math.floor(cell / size), col = cell % size;
    return [row > 0 ? cell - size : -1, col < size - 1 ? cell + 1 : -1, row < size - 1 ? cell + size : -1, col > 0 ? cell - 1 : -1]
        .filter(other => other >= 0 && !walls.has(linkKey(cell, other, size)));
}

// Traits d'une boucle donnée case par case
export const loopLinks = (loop: readonly number[], size: number) =>
    loop.map((cell, i) => linkKey(cell, loop[(i + 1) % loop.length]!, size));

type Board = { size: number; total: number; exits: number[][]; corners: Set<number> };

function boardOf(puzzle: BouclePuzzle): Board {
    const {size} = puzzle, total = size * size, walls = wallKeys(puzzle);
    return {
        size, total,
        exits: Array.from({length: total}, (_, cell) => boucleExits(puzzle, cell, walls)),
        corners: new Set([0, size - 1, total - size, total - 1]),
    };
}

const degrees = (b: Board, links: readonly number[]) => {
    const degree = new Array<number>(b.total).fill(0);
    for (const key of links) for (const cell of linkCells(key, b.size)) degree[cell]!++;
    return degree;
};

// Impasse : une case n'a plus assez de sorties, ou une boucle se ferme sans passer partout
type Dead = { dead: number; closes: boolean };
const isDead = (step: BoucleStep | Dead | null): step is Dead => step !== null && "dead" in step;

// Déduction simple (corner, wall, full, loop) sur ces traits, l'impasse, ou null s'il n'y en a plus
function simpleStep(b: Board, links: readonly number[]): BoucleStep | Dead | null {
    const {size, total, exits, corners} = b;
    const drawn = new Set(links);
    const degree = degrees(b, links);
    const cells = Array.from({length: total}, (_, cell) => cell);
    const missing = (cell: number, others: number[]) => others.map(o => linkKey(cell, o, size)).filter(key => !drawn.has(key));

    const parent = cells.slice();
    const find = (c: number): number => (parent[c] === c ? c : (parent[c] = find(parent[c]!)));
    for (const key of links) {
        const [a, c] = linkCells(key, size);
        if (degree[a]! > 2) return {dead: a, closes: false};
        if (find(a) === find(c) && links.length < total) return {dead: a, closes: true};
        parent[find(a)] = find(c);
    }
    if (links.length >= total) return null;

    // corner, puis wall : la case n'a que deux sorties
    for (const rule of ["corner", "wall"] as const) {
        for (const cell of cells) {
            if (exits[cell]!.length !== 2 || corners.has(cell) !== (rule === "corner")) continue;
            const todo = missing(cell, exits[cell]!);
            if (todo.length > 0) return {rule, cell, links: todo, spotlight: [cell, ...exits[cell]!], blocked: null};
        }
    }

    // full : les voisines pleines sont exclues, il reste juste ce qu'il faut
    const free = (cell: number) => exits[cell]!.filter(o => !drawn.has(linkKey(cell, o, size)) && degree[o]! < 2);
    for (const cell of cells) {
        const need = 2 - degree[cell]!;
        if (need <= 0) continue;
        const options = free(cell);
        if (options.length < need) return {dead: cell, closes: false};
        if (options.length !== need) continue;
        const blocked = exits[cell]!.find(o => degree[o] === 2 && !drawn.has(linkKey(cell, o, size))) ?? null;
        return {rule: "full", cell, links: missing(cell, options), spotlight: [cell, ...exits[cell]!], blocked};
    }

    // loop : relier les deux bouts d'un même morceau fermerait une boucle trop tôt
    const last = links.length === total - 1;
    for (const cell of cells) {
        const need = 2 - degree[cell]!;
        if (need <= 0) continue;
        const options = free(cell);
        const closing = options.filter(o => !last && find(o) === find(cell));
        if (closing.length === 0) continue;
        const open = options.filter(o => !closing.includes(o));
        if (open.length < need) return {dead: cell, closes: false};
        if (open.length !== need) continue;
        return {rule: "loop", cell, links: missing(cell, open), spotlight: [cell, ...exits[cell]!], blocked: closing[0]!};
    }
    return null;
}

// Essai : ce trait mène-t-il, de déduction simple en déduction simple, à une impasse ?
// (la case coincée et les traits forcés en chemin, sinon null)
function trial(b: Board, links: readonly number[], key: number): { stuck: number; closes: boolean; chain: number[] } | null {
    let current = [...links, key];
    for (let guard = 0; guard <= b.total; guard++) {
        const step = simpleStep(b, current);
        if (isDead(step)) return {stuck: step.dead, closes: step.closes, chain: current.slice(links.length + 1)};
        if (!step) return null;
        current = [...current, ...step.links];
    }
    return null;
}

export function nextBoucleStep(puzzle: BouclePuzzle, links: readonly number[], solution?: readonly number[]): BoucleStep | null {
    const b = boardOf(puzzle);
    const {size, total} = b;

    if (solution) {
        const good = new Set(solution);
        const wrong = links.find(key => !good.has(key));
        if (wrong !== undefined) {
            const [a, c] = linkCells(wrong, size);
            return {rule: "wrong", cell: a, links: [wrong], spotlight: [a, c], blocked: null};
        }
    }
    if (links.length >= total) return null;

    const simple = simpleStep(b, links);
    if (simple && !isDead(simple)) return simple;

    // trap : un bout de morceau n'a qu'une suite possible, les autres mènent à une impasse
    const drawn = new Set(links);
    const degree = degrees(b, links);
    for (let cell = 0; cell < total; cell++) {
        if (degree[cell] !== 1) continue;
        const options = b.exits[cell]!.filter(o => !drawn.has(linkKey(cell, o, size)) && degree[o]! < 2);
        const tries = options.map(o => ({o, dead: trial(b, links, linkKey(cell, o, size))}));
        const open = tries.filter(t => t.dead === null);
        const closed = tries.find(t => t.dead !== null);
        if (open.length !== 1 || !closed?.dead) continue;
        const {stuck, closes, chain} = closed.dead;
        const chainCells = chain.flatMap(key => linkCells(key, size));
        return {
            rule: "trap", cell, links: [linkKey(cell, open[0]!.o, size)],
            spotlight: [...new Set([cell, ...b.exits[cell]!, ...chainCells, stuck])], blocked: closed.o, chain,
            ...(closes ? {closes} : {stuck}),
        };
    }

    if (!solution) return null;
    const next = solution.find(key => !drawn.has(key))!;
    const [a, c] = linkCells(next, size);
    return {rule: "next", cell: a, links: [next], spotlight: [a, c], blocked: null};
}

// Joue le guide jusqu'au bout (tests) : les règles utilisées, et si la boucle est finie sans `next`
export function solveBoucleWithGuide(puzzle: BouclePuzzle, solution: readonly number[]) {
    let links: number[] = [];
    const rules: BoucleRule[] = [];
    for (let guard = 0; guard < 4 * puzzle.size * puzzle.size; guard++) {
        const step = nextBoucleStep(puzzle, links, solution);
        if (!step) break;
        rules.push(step.rule);
        links = [...links, ...step.links];
    }
    const good = new Set(solution);
    return {rules, links, solved: links.length === solution.length && links.every(key => good.has(key)) && !rules.includes("next")};
}
