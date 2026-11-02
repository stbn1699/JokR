import {countTectonicClues, generateTectonic, isTectonicSolution, type TectonicPuzzle} from "../utils/tectonic.js";
import {creditsFor, creditsTable} from "../utils/credits.js";

/*
 * Grilles proposées (carrées, `size` = côté) et nombre de cases à remplir pour chacune.
 * Mesuré : avec ces plages, le générateur tombe pile sur la cible en moins de 70 ms.
 */
export const TECTONIC_SIZES = [
    {size: 5, minEmptyCells: 10, maxEmptyCells: 18, defaultEmptyCells: 14},
    {size: 6, minEmptyCells: 16, maxEmptyCells: 27, defaultEmptyCells: 22},
    {size: 7, minEmptyCells: 24, maxEmptyCells: 38, defaultEmptyCells: 32},
    {size: 8, minEmptyCells: 32, maxEmptyCells: 50, defaultEmptyCells: 42},
] as const;

export const TECTONIC_DEFAULT_SIZE = 6;

const MAX_GENERATION_ATTEMPTS = 5;

export function tectonicLimits(size: number) {
    return TECTONIC_SIZES.find(s => s.size === size);
}

export class TectonicService {
    // Grille size×size avec exactement `cluesCount` nombres donnés si possible (quelques essais)
    generate(size: number, cluesCount: number): TectonicPuzzle {
        let best = generateTectonic(size, size, cluesCount);
        for (let attempt = 1; attempt < MAX_GENERATION_ATTEMPTS && countTectonicClues(best) !== cluesCount; attempt++) {
            const puzzle = generateTectonic(size, size, cluesCount);
            if (countTectonicClues(puzzle) < countTectonicClues(best)) best = puzzle;
        }
        return best;
    }

    /*
     * XP gagnée : référence = baseXp pour une grille 6×6 aux deux tiers vide.
     * Plus la grille est grande et plus elle est vide, plus elle rapporte. Bornée entre 20 et 300.
     */
    computeXp(baseXp: number, size: number, emptyCells: number): number {
        const sizeFactor = Math.pow((size * size) / 36, 0.6);
        const emptyFactor = Math.pow((emptyCells / (size * size)) / (2 / 3), 1.3);
        const xp = Math.round(baseXp * sizeFactor * emptyFactor);
        return Math.max(20, Math.min(xp, 300));
    }

    // Crédits gagnés (1 à 3) selon la difficulté, dans la plage proposée pour cette taille
    computeCredits(size: number, emptyCells: number): number {
        const limits = tectonicLimits(size);
        return limits ? creditsFor(emptyCells, limits.minEmptyCells, limits.maxEmptyCells) : 1;
    }

    // Plages, XP et crédits pour chaque taille (affichés avant de générer)
    settings(baseXp: number) {
        return {
            defaultSize: TECTONIC_DEFAULT_SIZE,
            sizes: TECTONIC_SIZES.map(limits => {
                const xpByEmptyCells: Record<number, number> = {};
                for (let empty = limits.minEmptyCells; empty <= limits.maxEmptyCells; empty++) {
                    xpByEmptyCells[empty] = this.computeXp(baseXp, limits.size, empty);
                }
                return {...limits, xpByEmptyCells, creditsByEmptyCells: creditsTable(limits.minEmptyCells, limits.maxEmptyCells)};
            }),
        };
    }

    // true si `values` (un nombre par case) résout la grille
    validate(puzzle: TectonicPuzzle, values: unknown): values is number[] {
        return isTectonicSolution(puzzle, values);
    }

    countClues(puzzle: TectonicPuzzle) {
        return countTectonicClues(puzzle);
    }
}
