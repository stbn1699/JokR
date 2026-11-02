// Paramètres proposés avant une partie de Queens (GET /queens/settings)
export interface QueensSizeSettings {
    // Côté de la grille (6 à 10) : autant de zones et de dames
    size: number;
    // Dames déjà placées au départ, en aide (moins = plus difficile)
    minHints: number;
    maxHints: number;
    defaultHints: number;
    // XP et crédits gagnés à la résolution, pour chaque nombre de dames données
    xpByHints: Record<number, number>;
    creditsByHints: Record<number, number>;
}

export interface QueensSettings {
    defaultSize: number;
    sizes: QueensSizeSettings[];
}

// Grille envoyée par le serveur (cases numérotées ligne par ligne)
export interface QueensPuzzle {
    size: number;
    // Numéro de la zone (couleur) de chaque case
    regions: number[];
    // Dames déjà placées (aide)
    queens: number[];
}
