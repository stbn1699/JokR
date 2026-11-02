// Paramètres proposés avant une partie de Galaxies (GET /galaxies/settings)
export interface GalaxiesSizeSettings {
    // Côté de la grille (5, 7, 9 ou 10)
    size: number;
    // Murs déjà tracés au départ, en aide (moins = plus difficile)
    minHints: number;
    maxHints: number;
    defaultHints: number;
    // XP et crédits gagnés à la résolution, pour chaque nombre de murs donnés
    xpByHints: Record<number, number>;
    creditsByHints: Record<number, number>;
}

export interface GalaxiesSettings {
    defaultSize: number;
    sizes: GalaxiesSizeSettings[];
}

// Point en coordonnées doublées [ligne, colonne] : le centre de la case (r, c) est [2r+1, 2c+1]
export type Dot = [number, number];

// Grille envoyée par le serveur
export interface GalaxiesPuzzle {
    width: number;
    height: number;
    dots: Dot[];
    // Murs déjà tracés (aide), voir galaxiesRules.ts pour la numérotation
    walls: number[];
}
