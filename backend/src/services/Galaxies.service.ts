import {clampXp} from "../utils/xpBounds.js";
import {type GalaxiesPuzzle, generateGalaxies, isGalaxiesSolution} from "../utils/galaxies.js";
import {creditsFor} from "../utils/credits.js";

/*
 * Grilles proposées (carrées, `size` = côté) et nombre de murs donnés en aide pour chacune.
 * Moins de murs donnés = plus difficile (0 = aucune aide).
 * Mesuré : le générateur répond en moins de 20 ms, même en 10×10.
 */
export const GALAXIES_SIZES = [
    {size: 5, minHints: 0, maxHints: 6, defaultHints: 3},
    {size: 7, minHints: 0, maxHints: 12, defaultHints: 5},
    {size: 9, minHints: 0, maxHints: 22, defaultHints: 8},
    {size: 10, minHints: 0, maxHints: 26, defaultHints: 10},
] as const;

export const GALAXIES_DEFAULT_SIZE = 7;

export function galaxiesLimits(size: number) {
    return GALAXIES_SIZES.find(s => s.size === size);
}

export class GalaxiesService {
    generate(size: number, hints: number): GalaxiesPuzzle {
        return generateGalaxies(size, size, hints).puzzle;
    }

    /*
     * XP gagnée : référence = baseXp pour une grille 7×7 sans aide.
     * Plus la grille est grande, plus elle rapporte ; chaque mur donné en retire un peu
     * (avec toute l'aide possible, 70 % de moins). Bornée entre 5 et 500 (voir xpBounds).
     */
    computeXp(baseXp: number, size: number, hints: number): number {
        const limits = galaxiesLimits(size);
        // grandes grilles sans aide → beaucoup d'XP ; toute l'aide possible retire 70 % de l'XP
        const sizeFactor = Math.pow((size * size) / 49, 0.85);
        const helpFactor = limits ? 1 - 0.7 * (hints / limits.maxHints) : 1;
        return clampXp(baseXp * sizeFactor * helpFactor);
    }

    // Crédits gagnés (1 à 3) : moins il y a d'aide, plus on en gagne
    computeCredits(size: number, hints: number): number {
        const limits = galaxiesLimits(size);
        return limits ? creditsFor(limits.maxHints - hints, 0, limits.maxHints) : 1;
    }

    // Plages, XP et crédits pour chaque taille (affichés avant de générer)
    settings(baseXp: number) {
        return {
            defaultSize: GALAXIES_DEFAULT_SIZE,
            sizes: GALAXIES_SIZES.map(limits => {
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

    // true si `regions` (numéro de point pour chaque case) résout la grille
    validate(puzzle: GalaxiesPuzzle, regions: unknown): regions is number[] {
        return isGalaxiesSolution(puzzle, regions);
    }
}
