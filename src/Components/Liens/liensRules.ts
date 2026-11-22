import type {LiensPuzzle} from "../../Models/liens.model.ts";

// Une ligne en cours de tracé : sa paire et ses cases, depuis la lettre de départ
export type Drawing = { pair: number; path: number[] };

export const isLinked = (puzzle: LiensPuzzle, pair: number, path: readonly number[]) => {
    const [a, b] = puzzle.pairs[pair]!;
    const first = path[0], last = path[path.length - 1];
    return path.length >= 2 && ((first === a && last === b) || (first === b && last === a));
};

export const allLinked = (puzzle: LiensPuzzle, paths: readonly (readonly number[])[]) =>
    paths.length === puzzle.pairs.length && paths.every((path, pair) => isLinked(puzzle, pair, path));

// Cases couvertes par les lignes (elles ne se chevauchent jamais)
export const filledCells = (paths: readonly (readonly number[])[]) => paths.reduce((sum, path) => sum + path.length, 0);

// Victoire : toutes les paires sont reliées et plus aucune case n'est vide
export const isSolved = (puzzle: LiensPuzzle, paths: readonly (readonly number[])[]) =>
    allLinked(puzzle, paths) && filledCells(paths) === puzzle.size * puzzle.size;

// Paire à laquelle appartient chaque lettre
export const endpointOwners = (puzzle: LiensPuzzle) => {
    const owners = new Map<number, number>();
    puzzle.pairs.forEach(([a, b], pair) => {
        owners.set(a, pair);
        owners.set(b, pair);
    });
    return owners;
};

// Lignes affichées pendant un tracé : celle qu'on dessine coupe les autres là où elle passe.
// Si on revient en arrière avant de relâcher, les lignes coupées réapparaissent.
export function overlayDrawing(paths: readonly number[][], drawing: Drawing | null): number[][] {
    if (!drawing) return paths as number[][];
    const crossed = new Set(drawing.path);
    return paths.map((path, pair) => {
        if (pair === drawing.pair) return drawing.path;
        const cut = path.findIndex(cell => crossed.has(cell));
        return cut < 0 ? path : path.slice(0, cut);
    });
}

// Début d'un tracé : sur une lettre (la ligne repart de là) ou sur une ligne existante (on la reprend à cet endroit)
export function startDrawing(puzzle: LiensPuzzle, paths: readonly number[][], cell: number): Drawing | null {
    const owner = endpointOwners(puzzle).get(cell);
    if (owner !== undefined) {
        const current = paths[owner] ?? [];
        // déjà la tête d'une ligne en cours : on continue sans l'effacer
        if (current.length > 1 && current[current.length - 1] === cell && !isLinked(puzzle, owner, current)) {
            return {pair: owner, path: [...current]};
        }
        return {pair: owner, path: [cell]};
    }
    const pair = paths.findIndex(path => path.includes(cell));
    if (pair < 0) return null;
    return {pair, path: paths[pair]!.slice(0, paths[pair]!.indexOf(cell) + 1)};
}

const isNextTo = (a: number, b: number, size: number) =>
    Math.abs(Math.floor(a / size) - Math.floor(b / size)) + Math.abs(a % size - b % size) === 1;

// Avance d'une case ; false si c'est impossible (lettre d'une autre paire, ligne déjà reliée)
function step(puzzle: LiensPuzzle, owners: Map<number, number>, drawing: Drawing, cell: number): Drawing | null {
    const {path, pair} = drawing;
    const back = path.indexOf(cell);
    if (back >= 0) return {pair, path: path.slice(0, back + 1)};
    if (!isNextTo(path[path.length - 1]!, cell, puzzle.size)) return null;
    if (isLinked(puzzle, pair, path)) return null;
    const owner = owners.get(cell);
    if (owner !== undefined && owner !== pair) return null;
    return {pair, path: [...path, cell]};
}

// Suit la souris jusqu'à `target`, case par case, même si elle a sauté plusieurs cases entre deux événements
export function drawTo(puzzle: LiensPuzzle, drawing: Drawing, target: number): Drawing {
    const owners = endpointOwners(puzzle);
    const {size} = puzzle;
    let current = drawing;
    for (let guard = 0; guard < size * 2 + 2; guard++) {
        const head = current.path[current.path.length - 1]!;
        if (head === target) break;

        const back = current.path.indexOf(target);
        if (back >= 0) return {pair: current.pair, path: current.path.slice(0, back + 1)};

        const dRow = Math.floor(target / size) - Math.floor(head / size);
        const dCol = target % size - head % size;
        const vertical = head + Math.sign(dRow) * size;
        const horizontal = head + Math.sign(dCol);
        const options = Math.abs(dRow) >= Math.abs(dCol) ? [dRow && vertical, dCol && horizontal] : [dCol && horizontal, dRow && vertical];
        let next: Drawing | null = null;
        for (let i = 0; i < options.length && !next; i++) {
            const usable = i === 0 ? (Math.abs(dRow) >= Math.abs(dCol) ? dRow !== 0 : dCol !== 0) : (Math.abs(dRow) >= Math.abs(dCol) ? dCol !== 0 : dRow !== 0);
            if (usable && !current.path.includes(options[i] as number)) next = step(puzzle, owners, current, options[i] as number);
        }
        if (!next) break;
        current = next;
    }
    return current;
}
