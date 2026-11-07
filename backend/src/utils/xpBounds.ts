/*
 * Bornes de l'XP d'une partie gagnée, communes à tous les jeux : une grille très facile rapporte peu,
 * une grille très difficile beaucoup (l'écart entre les deux est voulu, voir computeXp de chaque jeu).
 */
export const XP_MIN = 5;
export const XP_MAX = 500;

export const clampXp = (xp: number) => Math.max(XP_MIN, Math.min(Math.round(xp), XP_MAX));
