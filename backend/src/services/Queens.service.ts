import {clampXp} from "../utils/xpBounds.js";
import {generateQueens, isQueensSolution, type QueensPuzzle} from "../utils/queens.js";
import {creditsFor} from "../utils/credits.js";

/*
 * Grilles proposées (N×N, N zones, N dames) et nombre de dames données en aide pour chacune.
 * Moins de dames données = plus difficile (0 = aucune aide).
 * Mesuré : le générateur répond en moins de 20 ms jusqu'au 8×8, en 0,1 s environ en 10×10 (0,5 s au pire).
 */
export const QUEENS_SIZES = [
    {size: 6, minHints: 0, maxHints: 1, defaultHints: 0},
    {size: 7, minHints: 0, maxHints: 2, defaultHints: 0},
    {size: 8, minHints: 0, maxHints: 2, defaultHints: 1},
    {size: 9, minHints: 0, maxHints: 3, defaultHints: 1},
    {size: 10, minHints: 0, maxHints: 3, defaultHints: 1},
] as const;

export const QUEENS_DEFAULT_SIZE = 8;

export function queensLimits(size: number) {
    return QUEENS_SIZES.find(s => s.size === size);
}

export class QueensService {
    generate(size: number, hints: number): QueensPuzzle {
        return generateQueens(size, hints).puzzle;
    }

    /*
     * XP gagnée : référence = baseXp pour une grille 8×8 sans aide.
     * Plus la grille est grande, plus elle rapporte ; chaque dame donnée en retire un peu
     * (avec toute l'aide possible, 70 % de moins). Bornée entre 5 et 500 (voir xpBounds).
     */
    computeXp(baseXp: number, size: number, hints: number): number {
        const limits = queensLimits(size);
        // grandes grilles sans aide → beaucoup d'XP ; toute l'aide possible retire 70 % de l'XP
        const sizeFactor = Math.pow((size * size) / 64, 0.85);
        const helpFactor = limits && limits.maxHints > 0 ? 1 - 0.7 * (hints / limits.maxHints) : 1;
        return clampXp(baseXp * sizeFactor * helpFactor);
    }

    // Crédits gagnés (1 à 3) : moins il y a d'aide, plus on en gagne
    computeCredits(size: number, hints: number): number {
        const limits = queensLimits(size);
        return limits ? creditsFor(limits.maxHints - hints, 0, limits.maxHints) : 1;
    }

    // Plages, XP et crédits pour chaque taille (affichés avant de générer)
    settings(baseXp: number) {
        return {
            defaultSize: QUEENS_DEFAULT_SIZE,
            sizes: QUEENS_SIZES.map(limits => {
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

    // true si `queens` (case de chaque dame) résout la grille
    validate(puzzle: QueensPuzzle, queens: unknown): queens is number[] {
        return isQueensSolution(puzzle, queens);
    }
}
