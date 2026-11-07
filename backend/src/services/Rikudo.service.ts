import {clampXp} from "../utils/xpBounds.js";
import {countRikudoClues, generateRikudo, isRikudoSolution, type RikudoPuzzle, rikudoSize} from "../utils/rikudo.js";
import {creditsFor, creditsTable} from "../utils/credits.js";

/*
 * Plateaux proposés (nombre d'anneaux autour du centre) et nombre de cases à remplir pour chacun.
 * Mesuré : avec ces plages, le générateur trouve une grille à solution unique en moins de 50 ms.
 */
export const RIKUDO_SIZES = [
    {radius: 3, size: rikudoSize(3), minEmptyCells: 18, maxEmptyCells: 28, defaultEmptyCells: 24},
    {radius: 4, size: rikudoSize(4), minEmptyCells: 30, maxEmptyCells: 45, defaultEmptyCells: 40},
    {radius: 5, size: rikudoSize(5), minEmptyCells: 45, maxEmptyCells: 63, defaultEmptyCells: 56},
] as const;

export const RIKUDO_DEFAULT_SIZE = 36;

const MAX_ATTEMPTS = 40;

export function rikudoLimits(size: number) {
    return RIKUDO_SIZES.find(s => s.size === size);
}

export class RikudoService {
    /*
     * Grille de `size` cases avec `cluesCount` nombres donnés.
     * Le générateur abandonne parfois (trop de liens nécessaires) : on réessaie,
     * puis on ajoute un nombre donné si vraiment rien ne vient.
     */
    generate(size: number, cluesCount: number): RikudoPuzzle {
        const limits = rikudoLimits(size);
        if (!limits) throw new Error(`Taille de Rikudo inconnue : ${size}`);
        const maxLinks = Math.ceil(size / 4);
        for (let clues = cluesCount; ; clues++) {
            for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
                const puzzle = generateRikudo(limits.radius, clues, maxLinks);
                if (puzzle) return puzzle;
            }
        }
    }

    /*
     * XP gagnée : référence = baseXp pour 60 cases dont les deux tiers à trouver.
     * Plus le plateau est grand et plus il est vide, plus il rapporte. Bornée entre 5 et 500 (voir xpBounds).
     */
    computeXp(baseXp: number, size: number, emptyCells: number): number {
        // exposants élevés : petites grilles très remplies → peu d'XP, grandes grilles presque vides → beaucoup
        const sizeFactor = Math.pow(size / 60, 0.85);
        const emptyFactor = Math.pow((emptyCells / size) / (2 / 3), 2);
        return clampXp(baseXp * sizeFactor * emptyFactor);
    }

    // Crédits gagnés (1 à 3) selon la difficulté, dans la plage proposée pour cette taille
    computeCredits(size: number, emptyCells: number): number {
        const limits = rikudoLimits(size);
        return limits ? creditsFor(emptyCells, limits.minEmptyCells, limits.maxEmptyCells) : 1;
    }

    // Plages, XP et crédits pour chaque taille (affichés avant de générer)
    settings(baseXp: number) {
        return {
            defaultSize: RIKUDO_DEFAULT_SIZE,
            sizes: RIKUDO_SIZES.map(limits => {
                const xpByEmptyCells: Record<number, number> = {};
                for (let empty = limits.minEmptyCells; empty <= limits.maxEmptyCells; empty++) {
                    xpByEmptyCells[empty] = this.computeXp(baseXp, limits.size, empty);
                }
                return {...limits, xpByEmptyCells, creditsByEmptyCells: creditsTable(limits.minEmptyCells, limits.maxEmptyCells)};
            }),
        };
    }

    // true si `values` (un nombre par case) résout la grille
    validate(puzzle: RikudoPuzzle, values: unknown): values is number[] {
        return isRikudoSolution(puzzle, values);
    }

    countClues(puzzle: RikudoPuzzle) {
        return countRikudoClues(puzzle);
    }
}
