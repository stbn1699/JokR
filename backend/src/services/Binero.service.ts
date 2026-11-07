import {clampXp} from "../utils/xpBounds.js";
import {type BineroGrid, countBineroClues, EMPTY, generateBinero, isValidSolution} from "../utils/binero.js";
import {creditsFor, creditsTable} from "../utils/credits.js";

/*
 * Tailles de grille proposées et nombre de cases à remplir pour chacune.
 * Mesuré : avec ces plages, le générateur tombe pile sur la cible en moins de 100 ms.
 * Au-delà (grilles plus vides ou 14×14), il devient trop lent pour un serveur qui attend la réponse.
 */
export const BINERO_SIZES = [
    {size: 6, minEmptyCells: 10, maxEmptyCells: 25, defaultEmptyCells: 18},
    {size: 8, minEmptyCells: 20, maxEmptyCells: 44, defaultEmptyCells: 32},
    {size: 10, minEmptyCells: 30, maxEmptyCells: 65, defaultEmptyCells: 50},
    {size: 12, minEmptyCells: 45, maxEmptyCells: 80, defaultEmptyCells: 64},
] as const;

export const BINERO_DEFAULT_SIZE = 8;

const MAX_GENERATION_ATTEMPTS = 5;

export function bineroLimits(size: number) {
    return BINERO_SIZES.find(s => s.size === size);
}

// Conversion pour l'API : null pour une case vide
export const toApiGrid = (grid: BineroGrid) => grid.map(row => row.map(v => (v === EMPTY ? null : v)));

export class BineroService {
    // Grille avec exactement `cluesCount` chiffres donnés si possible (quelques essais)
    generate(size: number, cluesCount: number): BineroGrid {
        let best = generateBinero(size, cluesCount);
        for (let attempt = 1; attempt < MAX_GENERATION_ATTEMPTS && countBineroClues(best) !== cluesCount; attempt++) {
            const grid = generateBinero(size, cluesCount);
            if (countBineroClues(grid) < countBineroClues(best)) best = grid;
        }
        return best;
    }

    /*
     * XP gagnée : référence = baseXp pour une grille 8×8 à moitié vide.
     * Plus la grille est grande et plus elle est vide, plus elle rapporte. Bornée entre 5 et 500 (voir xpBounds).
     */
    computeXp(baseXp: number, size: number, emptyCells: number): number {
        // exposants élevés : petites grilles très remplies → peu d'XP, grandes grilles presque vides → beaucoup
        const sizeFactor = Math.pow((size * size) / 64, 0.85);
        const emptyFactor = Math.pow((emptyCells / (size * size)) / 0.5, 2);
        return clampXp(baseXp * sizeFactor * emptyFactor);
    }

    // Crédits gagnés (1 à 3) selon la difficulté, dans la plage proposée pour cette taille
    computeCredits(size: number, emptyCells: number): number {
        const limits = bineroLimits(size);
        return limits ? creditsFor(emptyCells, limits.minEmptyCells, limits.maxEmptyCells) : 1;
    }

    // Plages, XP et crédits pour chaque taille (affichés avant de générer)
    settings(baseXp: number) {
        return {
            defaultSize: BINERO_DEFAULT_SIZE,
            sizes: BINERO_SIZES.map(limits => {
                const xpByEmptyCells: Record<number, number> = {};
                for (let empty = limits.minEmptyCells; empty <= limits.maxEmptyCells; empty++) {
                    xpByEmptyCells[empty] = this.computeXp(baseXp, limits.size, empty);
                }
                return {...limits, xpByEmptyCells, creditsByEmptyCells: creditsTable(limits.minEmptyCells, limits.maxEmptyCells)};
            }),
        };
    }

    // true si `grid` est une grille size×size de 0/1 qui respecte les trois règles
    validate(grid: unknown, size: number): grid is BineroGrid {
        if (!Array.isArray(grid) || grid.length !== size) return false;
        for (const row of grid) {
            if (!Array.isArray(row) || row.length !== size) return false;
            if (!(row as unknown[]).every(v => v === 0 || v === 1)) return false;
        }
        return isValidSolution(grid as BineroGrid);
    }

    // true si chaque chiffre donné au départ est toujours à sa place
    respectsClues(puzzle: BineroGrid, grid: BineroGrid): boolean {
        return puzzle.every((row, r) => row.every((v, c) => v === EMPTY || grid[r]![c] === v));
    }
}
