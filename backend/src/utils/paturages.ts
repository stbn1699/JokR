import {clampXp} from "./xpBounds.js";
import {creditsFor} from "./credits.js";

/*
 * Pâturages : découper tout le pré en carrés, de tailles variées, avec exactement une vache dans chaque carré.
 * On part d'un vrai découpage, on y pose une vache par carré, puis on déplace les vaches jusqu'à ce que
 * ce découpage soit le seul possible.
 */

export type PaturagesSquare = { row: number; col: number; side: number };
export type PaturagesPuzzle = {
    size: number;
    // cases des vaches
    cows: number[];
    // carrés déjà posés au départ
    given: PaturagesSquare[];
    solution: PaturagesSquare[];
};
export type PublicPaturages = Omit<PaturagesPuzzle, "solution">;
type Random = (max: number) => number;

export const PATURAGES_DEFAULT_SIZE = 8;
// Le curseur règle les carrés donnés : 0 = sans aide
export const PATURAGES_SIZES = [
    {size: 6, min: 0, max: 3, default: 0},
    {size: 8, min: 0, max: 4, default: 0},
    {size: 10, min: 0, max: 5, default: 0},
    {size: 12, min: 0, max: 6, default: 0},
    {size: 14, min: 0, max: 8, default: 0},
];

const SEARCH_LIMIT = 40_000;
const FIX_STEPS = 80;
// part maximale de carrés 1×1 dans un découpage
const MAX_SINGLES = 0.25;
const MAX_SINGLES_SMALL = 0.5;

// Découpage aléatoire : chaque première case libre devient le coin d'un carré
function randomSquares(size: number, random: Random): PaturagesSquare[] {
    const used = new Uint8Array(size * size);
    const largest = Math.max(4, Math.ceil(size / 2));
    const squares: PaturagesSquare[] = [];
    for (let cell = 0; cell < size * size; cell++) {
        if (used[cell]) continue;
        const row = Math.floor(cell / size), col = cell % size;
        let room = 1;
        while (room < largest && row + room < size && col + room < size) {
            let free = true;
            for (let c = col; c <= col + room; c++) if (used[row * size + c]) free = false;
            if (!free) break;
            room++;
        }
        // un 1×1 se devine vite : rare, sauf s'il n'y a pas la place de faire plus grand
        const side = room === 1 || random(8) === 0 ? 1 : 2 + random(room - 1);
        for (let r = row; r < row + side; r++) for (let c = col; c < col + side; c++) used[r * size + c] = 1;
        squares.push({row, col, side});
    }
    return squares;
}

const randomCellIn = ({row, col, side}: PaturagesSquare, size: number, random: Random) =>
    (row + random(side)) * size + col + random(side);

// Cherche jusqu'à deux découpages valides ; null si la recherche est trop longue
function findSolutions(size: number, cows: readonly number[]): PaturagesSquare[][] | null {
    // somme des vaches par rectangle, pour compter celles d'un carré en une opération
    const sums = new Int32Array((size + 1) * (size + 1));
    const hasCow = new Uint8Array(size * size);
    cows.forEach(cell => { hasCow[cell] = 1; });
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            sums[(r + 1) * (size + 1) + c + 1] = hasCow[r * size + c]! + sums[r * (size + 1) + c + 1]! + sums[(r + 1) * (size + 1) + c]! - sums[r * (size + 1) + c]!;
        }
    }
    const count = (r: number, c: number, side: number) =>
        sums[(r + side) * (size + 1) + c + side]! - sums[r * (size + 1) + c + side]! - sums[(r + side) * (size + 1) + c]! + sums[r * (size + 1) + c]!;

    const used = new Uint8Array(size * size);
    const current: PaturagesSquare[] = [];
    const found: PaturagesSquare[][] = [];
    let nodes = 0;

    const search = (from: number): boolean => {
        if (++nodes > SEARCH_LIMIT) return false;
        let cell = from;
        while (cell < size * size && used[cell]) cell++;
        if (cell === size * size) {
            found.push([...current]);
            return found.length < 2;
        }
        const row = Math.floor(cell / size), col = cell % size;
        for (let side = 1; row + side <= size && col + side <= size; side++) {
            // la nouvelle colonne de droite doit être libre, sinon tous les carrés plus grands le sont aussi
            if (used[row * size + col + side - 1]) break;
            const cowsInside = count(row, col, side);
            if (cowsInside > 1) break;
            if (cowsInside === 0) continue;
            for (let r = row; r < row + side; r++) for (let c = col; c < col + side; c++) used[r * size + c] = 1;
            current.push({row, col, side});
            const goOn = search(cell + 1);
            current.pop();
            for (let r = row; r < row + side; r++) for (let c = col; c < col + side; c++) used[r * size + c] = 0;
            if (!goOn) return false;
        }
        return true;
    };
    search(0);
    return nodes > SEARCH_LIMIT ? null : found;
}

const sameSquare = (a: PaturagesSquare, b: PaturagesSquare) => a.row === b.row && a.col === b.col && a.side === b.side;

export function isUniquePaturages(size: number, cows: readonly number[]): boolean {
    return findSolutions(size, cows)?.length === 1;
}

export function generatePaturages(size: number, given: number, random: Random): PaturagesPuzzle {
    for (let attempt = 0; attempt < 2000; attempt++) {
        const squares = randomSquares(size, random);
        // sur un petit pré, mélanger les tailles laisse forcément quelques 1×1 dans les recoins
        if (squares.filter(square => square.side === 1).length > squares.length * (size <= 8 ? MAX_SINGLES_SMALL : MAX_SINGLES)) continue;
        // des tailles variées, et assez de carrés pour qu'il en reste à trouver malgré l'aide
        if (new Set(squares.map(square => square.side)).size < (size === 6 ? 2 : 3) || squares.length < given + 3) continue;
        const cows =squares.map(square => randomCellIn(square, size, random));

        for (let step = 0; step < FIX_STEPS; step++) {
            const solutions = findSolutions(size, cows);
            if (!solutions) break;
            if (solutions.length === 1) {
                const shuffled = [...squares];
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = random(i + 1);
                    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
                }
                // on garde toujours au moins un carré à trouver
                return {size, cows: [...cows], given: shuffled.slice(0, Math.min(given, squares.length - 1)), solution: squares};
            }
            // Déplace la vache d'un carré que l'autre solution ne respecte pas
            const other = solutions.find(solution => solution.some(square => !squares.some(s => sameSquare(s, square))))!;
            const differing = squares.map((square, index) => ({square, index})).filter(({square}) => square.side > 1 && !other.some(s => sameSquare(s, square)));
            if (differing.length === 0) break;
            const {square, index} = differing[random(differing.length)]!;
            cows[index] = randomCellIn(square, size, random);
        }
    }
    throw new Error(`Pré impossible (${size}×${size})`);
}

// Tous les carrés doivent couvrir le pré sans se chevaucher, avec une vache chacun, et garder les carrés donnés
export function isPaturagesSolution(puzzle: PaturagesPuzzle, squares: unknown): squares is PaturagesSquare[] {
    const {size, cows, given} = puzzle;
    if (!Array.isArray(squares) || squares.length !== cows.length) return false;
    const cowCells = new Set(cows);
    const seen = new Set<number>();
    for (const raw of squares as unknown[]) {
        if (typeof raw !== "object" || raw === null) return false;
        const {row, col, side} = raw as Record<string, unknown>;
        if (!Number.isInteger(row) || !Number.isInteger(col) || !Number.isInteger(side)) return false;
        const r = row as number, c = col as number, s = side as number;
        if (r < 0 || c < 0 || s < 1 || r + s > size || c + s > size) return false;
        let inside = 0;
        for (let y = r; y < r + s; y++) {
            for (let x = c; x < c + s; x++) {
                const cell = y * size + x;
                if (seen.has(cell)) return false;
                seen.add(cell);
                if (cowCells.has(cell)) inside++;
            }
        }
        if (inside !== 1) return false;
    }
    if (seen.size !== size * size) return false;
    return given.every(square => (squares as PaturagesSquare[]).some(s => sameSquare(s, square)));
}

// Référence : baseXp pour 10×10 sans aide ; chaque carré donné rend la partie plus simple
export function paturagesXp(baseXp: number, size: number, given: number): number {
    const limits = PATURAGES_SIZES.find(s => s.size === size);
    const help = limits ? given / limits.max : 0;
    return clampXp(baseXp * Math.pow(size / 10, 1.6) * (1 - 0.5 * help));
}

export function paturagesCredits(size: number, given: number): number {
    const limits = PATURAGES_SIZES.find(s => s.size === size);
    return limits ? creditsFor(limits.max - given, limits.min, limits.max) : 1;
}
