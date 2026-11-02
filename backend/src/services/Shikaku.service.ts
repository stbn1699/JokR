import {generateShikaku, isShikakuSolution, type ShikakuPuzzle} from "../utils/shikaku.js";
import {creditsFor} from "../utils/credits.js";

/*
 * Grilles proposées (carrées, `size` = côté) et nombre de rectangles donnés en aide pour chacune.
 * Moins de rectangles donnés = plus difficile (0 = aucune aide).
 * maxArea : aire maximale d'un rectangle. Mesuré : le générateur répond en moins de 150 ms, même en 15×15.
 */
export const SHIKAKU_SIZES = [
    {size: 5, maxArea: 8, minHints: 0, maxHints: 2, defaultHints: 1},
    {size: 7, maxArea: 10, minHints: 0, maxHints: 3, defaultHints: 1},
    {size: 10, maxArea: 12, minHints: 0, maxHints: 4, defaultHints: 2},
    {size: 12, maxArea: 14, minHints: 0, maxHints: 6, defaultHints: 3},
    {size: 15, maxArea: 16, minHints: 0, maxHints: 8, defaultHints: 4},
] as const;

export const SHIKAKU_DEFAULT_SIZE = 7;

export function shikakuLimits(size: number) {
    return SHIKAKU_SIZES.find(s => s.size === size);
}

export class ShikakuService {
    generate(size: number, hints: number): ShikakuPuzzle {
        const limits = shikakuLimits(size);
        if (!limits) throw new Error(`Taille de Shikaku inconnue : ${size}`);
        return generateShikaku(size, size, hints, limits.maxArea).puzzle;
    }

    /*
     * XP gagnée : référence = baseXp pour une grille 10×10 sans aide.
     * Plus la grille est grande, plus elle rapporte ; chaque rectangle donné en retire un peu
     * (avec toute l'aide possible, moitié moins). Bornée entre 20 et 300.
     */
    computeXp(baseXp: number, size: number, hints: number): number {
        const limits = shikakuLimits(size);
        const sizeFactor = Math.pow((size * size) / 100, 0.6);
        const helpFactor = limits && limits.maxHints > 0 ? 1 - 0.5 * (hints / limits.maxHints) : 1;
        const xp = Math.round(baseXp * sizeFactor * helpFactor);
        return Math.max(20, Math.min(xp, 300));
    }

    // Crédits gagnés (1 à 3) : moins il y a d'aide, plus on en gagne
    computeCredits(size: number, hints: number): number {
        const limits = shikakuLimits(size);
        return limits ? creditsFor(limits.maxHints - hints, 0, limits.maxHints) : 1;
    }

    // Plages, XP et crédits pour chaque taille (affichés avant de générer)
    settings(baseXp: number) {
        return {
            defaultSize: SHIKAKU_DEFAULT_SIZE,
            // maxArea reste côté serveur
            sizes: SHIKAKU_SIZES.map(({size, minHints, maxHints, defaultHints}) => {
                const limits = {size, minHints, maxHints, defaultHints};
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

    // true si `regions` (numéro du nombre de chaque case) résout la grille
    validate(puzzle: ShikakuPuzzle, regions: unknown): regions is number[] {
        return isShikakuSolution(puzzle, regions);
    }
}
