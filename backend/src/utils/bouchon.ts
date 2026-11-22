import {clampXp} from "./xpBounds.js";
import {creditsFor} from "./credits.js";
import {BOUCHON_BANK} from "./bouchonBankData.js";

/*
 * Bouchon : faire coulisser les véhicules, chacun dans son axe, pour amener le taxi jusqu'à la sortie à droite.
 * Les parkings viennent d'une banque calculée à l'avance (scripts/build-bouchon-bank.ts) : chacun a une solution
 * dont la longueur minimale est connue. Toute suite de coups qui amène le taxi à la sortie gagne.
 */

export type BouchonVehicle = { row: number; col: number; length: number; horizontal: boolean };
export type BouchonPuzzle = {
    size: number;
    // le véhicule 0 est le taxi, sur la ligne de sortie
    exitRow: number;
    vehicles: BouchonVehicle[];
    minMoves: number;
};
// Un coup : [véhicule, nouvelle position sur son axe]
export type BouchonMove = [number, number];
type Random = (max: number) => number;

export const BOUCHON_DEFAULT_SIZE = 6;
// Réglages déduits de la banque : du parking le plus simple au plus long à résoudre
export const BOUCHON_SIZES = Object.entries(BOUCHON_BANK).map(([size, levels]) => {
    const depths = Object.keys(levels).map(Number);
    const min = Math.min(...depths), max = Math.max(...depths);
    return {size: Number(size), min, max, default: min + Math.round((max - min) * 0.4)};
});

const MAX_REPLAY = 5000;

const axisPosition = (v: BouchonVehicle) => (v.horizontal ? v.col : v.row);
const cellAt = (v: BouchonVehicle, position: number, offset: number, size: number) =>
    v.horizontal ? v.row * size + position + offset : (position + offset) * size + v.col;

function occupancy(size: number, vehicles: BouchonVehicle[], positions: ArrayLike<number>) {
    const grid = new Uint8Array(size * size);
    vehicles.forEach((v, index) => {
        for (let offset = 0; offset < v.length; offset++) grid[cellAt(v, positions[index]!, offset, size)] = index + 1;
    });
    return grid;
}

// Appelle `visit` pour chaque glissement possible, d'une ou plusieurs cases
function forEachMove(size: number, vehicles: BouchonVehicle[], positions: ArrayLike<number>, visit: (index: number, to: number) => void) {
    const grid = occupancy(size, vehicles, positions);
    vehicles.forEach((v, index) => {
        const from = positions[index]!;
        for (let to = from + 1; to + v.length <= size && !grid[cellAt(v, to, v.length - 1, size)]; to++) visit(index, to);
        for (let to = from - 1; to >= 0 && !grid[cellAt(v, to, 0, size)]; to--) visit(index, to);
    });
}

// Toutes les positions atteignables et leur distance à la sortie ; null au-delà de maxStates
export function exploreParking(size: number, vehicles: BouchonVehicle[], maxStates: number) {
    const count = vehicles.length;
    // une position va de 0 à size - 2 : la clé tient dans un nombre jusqu'à 18 véhicules en 8×8
    const base = size - 1;
    const keyOf = (positions: ArrayLike<number>) => {
        let key = 0;
        for (let i = 0; i < count; i++) key = key * base + positions[i]!;
        return key;
    };
    const start = Uint8Array.from(vehicles, axisPosition);
    const states: Uint8Array[] = [start];
    const indexOf = new Map<number, number>([[keyOf(start), 0]]);
    const next = new Uint8Array(count);

    for (let head = 0; head < states.length; head++) {
        const current = states[head]!;
        forEachMove(size, vehicles, current, (index, to) => {
            next.set(current);
            next[index] = to;
            const key = keyOf(next);
            if (indexOf.has(key)) return;
            indexOf.set(key, states.length);
            states.push(next.slice());
        });
        if (states.length > maxStates) return null;
    }

    // Distance depuis toutes les positions gagnantes à la fois (les coups sont réversibles)
    const distance = new Int16Array(states.length).fill(-1);
    const queue: number[] = [];
    states.forEach((state, index) => {
        if (state[0] === size - 2) {
            distance[index] = 0;
            queue.push(index);
        }
    });
    let deepest = 0;
    for (let head = 0; head < queue.length; head++) {
        const index = queue[head]!;
        const current = states[index]!;
        forEachMove(size, vehicles, current, (vehicle, to) => {
            next.set(current);
            next[vehicle] = to;
            const neighbour = indexOf.get(keyOf(next))!;
            if (distance[neighbour] !== -1) return;
            distance[neighbour] = distance[index]! + 1;
            deepest = Math.max(deepest, distance[neighbour]!);
            queue.push(neighbour);
        });
    }
    return {states, distance, deepest};
}

// Banque : 3 caractères par véhicule (ligne, colonne, type a = H2, b = H3, c = V2, d = V3), le taxi en premier
export function encodeParking(vehicles: BouchonVehicle[]): string {
    return vehicles.map(v => `${v.row}${v.col}${"abcd"[(v.horizontal ? 0 : 2) + v.length - 2]}`).join("");
}

export function decodeParking(text: string): BouchonVehicle[] {
    const vehicles: BouchonVehicle[] = [];
    for (let i = 0; i < text.length; i += 3) {
        const type = "abcd".indexOf(text[i + 2]!);
        vehicles.push({row: Number(text[i]), col: Number(text[i + 1]), length: 2 + type % 2, horizontal: type < 2});
    }
    return vehicles;
}

// Tire un parking de la banque, parfois retourné haut/bas, avec les véhicules dans un ordre (donc des couleurs) différent
export function generateBouchon(size: number, moves: number, random: Random): BouchonPuzzle {
    const options = BOUCHON_BANK[size]?.[moves];
    if (!options?.length) throw new Error(`Aucun parking (${size}×${size}, ${moves} coups)`);
    let vehicles = decodeParking(options[random(options.length)]!);
    if (random(2) === 0) {
        vehicles = vehicles.map(v => ({...v, row: size - 1 - v.row - (v.horizontal ? 0 : v.length - 1)}));
    }
    for (let i = vehicles.length - 1; i > 1; i--) {
        const j = 1 + random(i);
        [vehicles[i], vehicles[j]] = [vehicles[j]!, vehicles[i]!];
    }
    return {size, exitRow: vehicles[0]!.row, vehicles, minMoves: moves};
}

// Rejoue les coups du joueur : chaque glissement doit être libre et le taxi doit finir à la sortie
export function isBouchonSolution(puzzle: BouchonPuzzle, moves: unknown): moves is BouchonMove[] {
    if (!Array.isArray(moves) || moves.length === 0 || moves.length > MAX_REPLAY) return false;
    const {size, vehicles} = puzzle;
    const positions = vehicles.map(axisPosition);

    for (const move of moves as unknown[]) {
        if (!Array.isArray(move) || move.length !== 2) return false;
        const [index, to] = move as unknown[];
        if (!Number.isInteger(index) || !Number.isInteger(to)) return false;
        const vehicle = vehicles[index as number];
        if (!vehicle || (to as number) < 0 || (to as number) + vehicle.length > size || to === positions[index as number]) return false;

        const grid = occupancy(size, vehicles, positions);
        const from = positions[index as number]!;
        const step = (to as number) > from ? 1 : -1;
        for (let position = from + step; ; position += step) {
            const entering = step > 0 ? position + vehicle.length - 1 : position;
            const cell = vehicle.horizontal ? vehicle.row * size + entering : entering * size + vehicle.col;
            if (grid[cell]) return false;
            if (position === to) break;
        }
        positions[index as number] = to as number;
    }
    return positions[0] === size - 2;
}

// Référence : baseXp pour 6×6 en réglage moyen ; plus de coups nécessaires = plus dur
export function bouchonXp(baseXp: number, size: number, moves: number): number {
    const limits = BOUCHON_SIZES.find(s => s.size === size);
    const position = limits ? (moves - limits.min) / Math.max(1, limits.max - limits.min) : 0.5;
    return clampXp(baseXp * (size / 6) * (0.6 + 0.8 * position));
}

export function bouchonCredits(size: number, moves: number): number {
    const limits = BOUCHON_SIZES.find(s => s.size === size);
    return limits ? creditsFor(moves, limits.min, limits.max) : 1;
}
