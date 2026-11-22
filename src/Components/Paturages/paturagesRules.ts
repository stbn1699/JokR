import type {PaturagesPuzzle, PaturagesSquare} from "../../Models/paturages.model.ts";

// Un carré posé garde sa couleur tant qu'il reste sur le pré
export type PlacedSquare = PaturagesSquare & { color: number };

const COLOR_COUNT = 10;

// Carré tracé d'une case à une autre : toujours carré, et toujours dans le pré
export function squareFromDrag(size: number, anchorRow: number, anchorCol: number, row: number, col: number): PaturagesSquare {
    const dRow = row - anchorRow, dCol = col - anchorCol;
    const roomV = dRow < 0 ? anchorRow + 1 : size - anchorRow;
    const roomH = dCol < 0 ? anchorCol + 1 : size - anchorCol;
    const side = Math.min(Math.max(Math.abs(dRow), Math.abs(dCol)) + 1, roomV, roomH);
    return {
        row: dRow < 0 ? anchorRow - side + 1 : anchorRow,
        col: dCol < 0 ? anchorCol - side + 1 : anchorCol,
        side,
    };
}

export const overlaps = (a: PaturagesSquare, b: PaturagesSquare) =>
    a.row < b.row + b.side && b.row < a.row + a.side && a.col < b.col + b.side && b.col < a.col + a.side;

const touches = (a: PaturagesSquare, b: PaturagesSquare) =>
    a.row <= b.row + b.side && b.row <= a.row + a.side && a.col <= b.col + b.side && b.col <= a.col + a.side;

export const sameSquare = (a: PaturagesSquare, b: PaturagesSquare) => a.row === b.row && a.col === b.col && a.side === b.side;

export const contains = (square: PaturagesSquare, row: number, col: number) =>
    row >= square.row && row < square.row + square.side && col >= square.col && col < square.col + square.side;

export const cowsIn = (square: PaturagesSquare, cows: readonly number[], size: number) =>
    cows.filter(cell => contains(square, Math.floor(cell / size), cell % size)).length;

// Première couleur qu'aucun carré voisin n'utilise
export function pickColor(squares: readonly PlacedSquare[], square: PaturagesSquare): number {
    const taken = new Set(squares.filter(other => touches(other, square)).map(other => other.color));
    for (let color = 0; color < COLOR_COUNT; color++) if (!taken.has(color)) return color;
    return 0;
}

export function initialSquares(puzzle: PaturagesPuzzle): PlacedSquare[] {
    const squares: PlacedSquare[] = [];
    for (const square of puzzle.given) squares.push({...square, color: pickColor(squares, square)});
    return squares;
}

export const isGiven = (puzzle: PaturagesPuzzle, square: PaturagesSquare) => puzzle.given.some(g => sameSquare(g, square));

// Pose un carré à la place de ceux qu'il recouvre ; null s'il touche un carré donné
export function placeSquare(puzzle: PaturagesPuzzle, squares: readonly PlacedSquare[], square: PaturagesSquare): PlacedSquare[] | null {
    if (puzzle.given.some(g => overlaps(g, square))) return null;
    const kept = squares.filter(other => !overlaps(other, square));
    return [...kept, {...square, color: pickColor(kept, square)}];
}

export const isSolved = (puzzle: PaturagesPuzzle, squares: readonly PaturagesSquare[]) =>
    squares.length === puzzle.cows.length
    && squares.reduce((area, s) => area + s.side * s.side, 0) === puzzle.size * puzzle.size
    && squares.every(s => cowsIn(s, puzzle.cows, puzzle.size) === 1);
