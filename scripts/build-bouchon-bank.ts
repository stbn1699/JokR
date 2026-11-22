/*
 * Calcule la banque de parkings de Bouchon (backend/src/utils/bouchonBankData.ts).
 * Part de parkings au hasard, les rend plus difficiles par petites retouches, puis garde,
 * pour chaque nombre de coups, des positions dont la solution la plus courte fait exactement ce nombre.
 * Lancement, depuis backend/ : node --import ./node_modules/tsx/dist/esm/index.mjs ../scripts/build-bouchon-bank.ts
 */
import {randomInt} from "node:crypto";
import {writeFileSync} from "node:fs";
import {type BouchonVehicle, encodeParking, exploreParking} from "../backend/src/utils/bouchon.ts";

const SETTINGS: Record<number, { vehicles: [number, number]; seconds: number; maxStates: number }> = {
    6: {vehicles: [9, 13], seconds: 60, maxStates: 30_000},
    7: {vehicles: [12, 17], seconds: 100, maxStates: 50_000},
    8: {vehicles: [15, 18], seconds: 140, maxStates: 60_000},
};
const FIRST_DEPTH = 3;
const PER_DEPTH = 30;
const MIN_PER_DEPTH = 12;
const CLIMB_STEPS = 60;

const cellsOf = (v: BouchonVehicle, size: number) =>
    Array.from({length: v.length}, (_, i) => (v.horizontal ? v.row * size + v.col + i : (v.row + i) * size + v.col));

// Ajoute des véhicules libres jusqu'à `wanted` ; le taxi est devant la sortie, seul horizontal sur sa ligne
function fill(size: number, vehicles: BouchonVehicle[], wanted: number) {
    const exitRow = vehicles[0]!.row;
    const grid = new Uint8Array(size * size);
    vehicles.forEach(v => cellsOf(v, size).forEach(cell => { grid[cell] = 1; }));
    for (let tries = 0; tries < 200 && vehicles.length < wanted; tries++) {
        const horizontal = randomInt(5) < 2;
        const length = randomInt(3) === 0 ? 3 : 2;
        const along = randomInt(size - length + 1), across = randomInt(size);
        if (horizontal && across === exitRow) continue;
        const v = horizontal ? {row: across, col: along, length, horizontal} : {row: along, col: across, length, horizontal};
        const cells = cellsOf(v, size);
        if (cells.some(cell => grid[cell])) continue;
        cells.forEach(cell => { grid[cell] = 1; });
        vehicles.push(v);
    }
    return vehicles;
}

function buildSize(size: number) {
    const {vehicles: [low, high], seconds, maxStates} = SETTINGS[size]!;
    const exitRow = Math.floor((size - 1) / 2);
    const found = new Map<number, Set<string>>();
    const deadline = Date.now() + seconds * 1000;

    while (Date.now() < deadline) {
        const wanted = low + randomInt(high - low + 1);
        let current = fill(size, [{row: exitRow, col: size - 2, length: 2, horizontal: true}], wanted);
        let explored = exploreParking(size, current, maxStates);
        if (!explored) continue;

        for (let step = 0; step < CLIMB_STEPS && Date.now() < deadline; step++) {
            const kept = current.filter((_, index) => index === 0 || randomInt(current.length) > 1);
            const candidate = fill(size, kept, Math.min(high, wanted));
            const result = exploreParking(size, candidate, maxStates);
            if (result && result.deepest >= explored.deepest) {
                current = candidate;
                explored = result;
            }
        }

        // Jusqu'à deux positions par profondeur pour ce parking
        const byDepth = new Map<number, number[]>();
        explored.distance.forEach((depth, index) => {
            if (depth >= FIRST_DEPTH) byDepth.set(depth, [...(byDepth.get(depth) ?? []).slice(-40), index]);
        });
        for (const [depth, indexes] of byDepth) {
            const set = found.get(depth) ?? new Set<string>();
            found.set(depth, set);
            for (let pick = 0; pick < 2 && set.size < PER_DEPTH; pick++) {
                const state = explored.states[indexes[randomInt(indexes.length)]!]!;
                set.add(encodeParking(current.map((v, i) => (v.horizontal ? {...v, col: state[i]!} : {...v, row: state[i]!}))));
            }
        }
    }

    // Garde une suite continue de difficultés, chacune assez fournie
    const levels: Record<number, string[]> = {};
    for (let depth = FIRST_DEPTH; (found.get(depth)?.size ?? 0) >= MIN_PER_DEPTH; depth++) levels[depth] = [...found.get(depth)!];
    const summary = [...found.entries()].sort((a, b) => a[0] - b[0]).map(([d, s]) => `${d}:${s.size}`).join(" ");
    console.log(`${size}×${size} : ${summary}`);
    return levels;
}

const bank: Record<number, Record<number, string[]>> = {};
for (const size of Object.keys(SETTINGS).map(Number)) bank[size] = buildSize(size);
const body = `// Généré par scripts/build-bouchon-bank.ts\nexport const BOUCHON_BANK: Record<number, Record<number, string[]>> = ${JSON.stringify(bank)};\n`;
writeFileSync(new URL("../backend/src/utils/bouchonBankData.ts", import.meta.url), body);
console.log(`Banque écrite (${Math.round(body.length / 1024)} Ko)`);
