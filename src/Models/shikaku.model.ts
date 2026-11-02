// Paramètres proposés avant une partie de Shikaku (GET /shikaku/settings)
export interface ShikakuSizeSettings {
    // Côté de la grille (5, 7, 10, 12 ou 15)
    size: number;
    // Rectangles déjà tracés au départ, en aide (moins = plus difficile)
    minHints: number;
    maxHints: number;
    defaultHints: number;
    // XP et crédits gagnés à la résolution, pour chaque nombre de rectangles donnés
    xpByHints: Record<number, number>;
    creditsByHints: Record<number, number>;
}

export interface ShikakuSettings {
    defaultSize: number;
    sizes: ShikakuSizeSettings[];
}

// Rectangle : [ligne, colonne, hauteur, largeur]
export type Rect = [number, number, number, number];

// Grille envoyée par le serveur (cases numérotées ligne par ligne)
export interface ShikakuPuzzle {
    width: number;
    height: number;
    // Nombres : case et aire du rectangle qui le contient
    clues: { cell: number; area: number }[];
    // Rectangles déjà tracés (aide)
    rects: Rect[];
}
