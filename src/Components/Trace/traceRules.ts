import {isTraceSolution, type TracePuzzle, traceNeighbours} from "../../../backend/src/utils/trace.ts";

/*
 * Règles du Tracé côté site : le chemin part toujours du 1 et ne peut avancer que d'une case voisine libre,
 * sans traverser de mur, en prenant les numéros dans l'ordre (le dernier seulement quand toutes les autres
 * cases sont prises). Revenir sur une case du chemin l'efface jusque-là.
 */

const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

export function wallSet(puzzle: TracePuzzle): Set<string> {
    return new Set(puzzle.walls.map(([a, b]) => key(a, b)));
}

export const hasWall = (walls: Set<string>, a: number, b: number) => walls.has(key(a, b));

export const startCell = (puzzle: TracePuzzle) => puzzle.numbers.find(n => n.value === 1)!.cell;
export const lastValue = (puzzle: TracePuzzle) => Math.max(...puzzle.numbers.map(n => n.value));

// Prochain numéro à atteindre après ce chemin
export function nextValue(puzzle: TracePuzzle, path: number[]): number {
    const values = new Map(puzzle.numbers.map(n => [n.cell, n.value]));
    let next = 1;
    for (const c of path) if (values.get(c) === next) next++;
    return next;
}

// La case peut-elle prolonger le chemin ?
export function canStep(puzzle: TracePuzzle, walls: Set<string>, path: number[], cell: number): boolean {
    const end = path[path.length - 1];
    if (end === undefined || path.includes(cell)) return false;
    if (!traceNeighbours(puzzle.size, end).includes(cell) || hasWall(walls, end, cell)) return false;
    const value = puzzle.numbers.find(n => n.cell === cell)?.value;
    if (value === undefined) return true;
    if (value !== nextValue(puzzle, path)) return false;
    // le dernier numéro ferme le chemin : seulement quand c'est la dernière case libre
    return value !== lastValue(puzzle) || path.length === puzzle.size * puzzle.size - 1;
}

/**
 * Le doigt entre dans une case : recule d'une case (case précédente), coupe le chemin (case déjà prise),
 * avance (case voisine permise) ou ne fait rien. Renvoie le nouveau chemin.
 */
export function enterCell(puzzle: TracePuzzle, walls: Set<string>, path: number[], cell: number): number[] {
    const at = path.indexOf(cell);
    if (at >= 0) return at === path.length - 1 ? path : path.slice(0, at + 1);
    return canStep(puzzle, walls, path, cell) ? [...path, cell] : path;
}

// Chemin complet et juste : la solution à envoyer, sinon null
export const traceSolution = (puzzle: TracePuzzle | null, path: number[]): number[] | null =>
    puzzle && isTraceSolution(puzzle, path) ? path : null;
