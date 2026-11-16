import {randomInt} from "node:crypto";
import {clampXp} from "../utils/xpBounds.js";
import {generateTrace, isTraceSolution, type TracePuzzle} from "../utils/trace.js";
import {creditsFor} from "../utils/credits.js";

/*
 * Grilles proposées (N×N) et numéros donnés en plus de ceux qu'il faut pour n'avoir qu'une solution.
 * Plus de numéros = plus facile (0 = le strict nécessaire).
 * Mesuré : moins de 20 ms jusqu'au 7×7, quelques dizaines de ms en 8×8 (0,6 s au pire).
 */
export const TRACE_SIZES = [
    {size: 5, minHints: 0, maxHints: 3, defaultHints: 1},
    {size: 6, minHints: 0, maxHints: 4, defaultHints: 1},
    {size: 7, minHints: 0, maxHints: 5, defaultHints: 2},
    {size: 8, minHints: 0, maxHints: 6, defaultHints: 2},
] as const;

export const TRACE_DEFAULT_SIZE = 6;

export function traceLimits(size: number) {
    return TRACE_SIZES.find(s => s.size === size);
}

export class TraceService {
    generate(size: number, hints: number): TracePuzzle {
        return generateTrace(size, hints, n => randomInt(n)).puzzle;
    }

    /*
     * XP gagnée : référence = baseXp pour une grille 6×6 sans aide.
     * Plus la grille est grande, plus elle rapporte ; chaque numéro donné en plus en retire un peu
     * (avec toute l'aide possible, 60 % de moins). Bornée entre 5 et 500 (voir xpBounds).
     */
    computeXp(baseXp: number, size: number, hints: number): number {
        const limits = traceLimits(size);
        const sizeFactor = Math.pow((size * size) / 36, 0.9);
        const helpFactor = limits && limits.maxHints > 0 ? 1 - 0.6 * (hints / limits.maxHints) : 1;
        return clampXp(baseXp * sizeFactor * helpFactor);
    }

    // Crédits gagnés (1 à 3) : moins il y a d'aide, plus on en gagne
    computeCredits(size: number, hints: number): number {
        const limits = traceLimits(size);
        return limits ? creditsFor(limits.maxHints - hints, 0, limits.maxHints) : 1;
    }

    // Plages, XP et crédits pour chaque taille (affichés avant de générer)
    settings(baseXp: number) {
        return {
            defaultSize: TRACE_DEFAULT_SIZE,
            sizes: TRACE_SIZES.map(limits => {
                const xpByHints: Record<number, number> = {};
                const creditsByHints: Record<number, number> = {};
                for (let hints = limits.minHints; hints <= limits.maxHints; hints++) {
                    xpByHints[hints] = this.computeXp(baseXp, limits.size, hints);
                    creditsByHints[hints] = this.computeCredits(limits.size, hints);
                }
                return {...limits, xpByHints, creditsByHints};
            }),
        };
    }

    // true si `path` (cases dans l'ordre du chemin) résout la grille
    validate(puzzle: TracePuzzle, path: unknown): path is number[] {
        return isTraceSolution(puzzle, path);
    }
}
