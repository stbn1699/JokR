/*
 * Crédits gagnés en finissant un puzzle : de 1 à 3 selon la difficulté choisie.
 * La plage de cases à remplir proposée pour la taille de grille est coupée en trois :
 * premier tiers (plus facile) = 1 crédit, deuxième = 2, dernier tiers (plus difficile) = 3.
 */

export const MIN_CREDITS = 1;
export const MAX_CREDITS = 3;

export function creditsFor(emptyCells: number, minEmptyCells: number, maxEmptyCells: number): number {
    if (maxEmptyCells <= minEmptyCells) return MIN_CREDITS;
    const position = (emptyCells - minEmptyCells) / (maxEmptyCells - minEmptyCells);
    const credits = MIN_CREDITS + Math.floor(Math.min(Math.max(position, 0), 1) * (MAX_CREDITS - MIN_CREDITS + 1));
    return Math.min(credits, MAX_CREDITS);
}

// Crédits pour chaque nombre de cases à remplir d'une plage (affichés avant de jouer)
export function creditsTable(minEmptyCells: number, maxEmptyCells: number): Record<number, number> {
    const table: Record<number, number> = {};
    for (let empty = minEmptyCells; empty <= maxEmptyCells; empty++) {
        table[empty] = creditsFor(empty, minEmptyCells, maxEmptyCells);
    }
    return table;
}
