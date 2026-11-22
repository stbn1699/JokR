import type {BouchonMove, BouchonPuzzle} from "../../Models/bouchon.model.ts";

// Position de chaque véhicule sur son axe après les coups joués
export function positionsAfter(puzzle: BouchonPuzzle, moves: readonly BouchonMove[]): number[] {
    const positions = puzzle.vehicles.map(v => (v.horizontal ? v.col : v.row));
    for (const [index, to] of moves) positions[index] = to;
    return positions;
}

// Jusqu'où un véhicule peut glisser, dans les deux sens, sans toucher les autres
export function slideRange(puzzle: BouchonPuzzle, positions: readonly number[], index: number): [number, number] {
    const {size, vehicles} = puzzle;
    const taken = new Set<number>();
    vehicles.forEach((v, i) => {
        if (i === index) return;
        for (let offset = 0; offset < v.length; offset++) {
            const along = positions[i]! + offset;
            taken.add(v.horizontal ? v.row * size + along : along * size + v.col);
        }
    });
    const vehicle = vehicles[index]!;
    const cell = (along: number) => (vehicle.horizontal ? vehicle.row * size + along : along * size + vehicle.col);
    let min = positions[index]!, max = min;
    while (min > 0 && !taken.has(cell(min - 1))) min--;
    while (max + vehicle.length < size && !taken.has(cell(max + vehicle.length))) max++;
    return [min, max];
}

// Plusieurs glissements de suite du même véhicule comptent pour un seul coup
export const countMoves = (moves: readonly BouchonMove[]) =>
    moves.filter((move, i) => i === 0 || moves[i - 1]![0] !== move[0]).length;

export const isOut = (puzzle: BouchonPuzzle, positions: readonly number[]) => positions[0] === puzzle.size - 2;
