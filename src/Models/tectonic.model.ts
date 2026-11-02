// Paramètres proposés avant une partie de Tectonic (GET /tectonic/settings)
export interface TectonicSizeSettings {
    // Côté de la grille (5 à 8)
    size: number;
    minEmptyCells: number;
    maxEmptyCells: number;
    defaultEmptyCells: number;
    // XP gagnée à la résolution, pour chaque nombre de cases à remplir
    xpByEmptyCells: Record<number, number>;
    // Crédits gagnés (1 à 3) pour chaque nombre de cases à remplir
    creditsByEmptyCells: Record<number, number>;
}

export interface TectonicSettings {
    defaultSize: number;
    sizes: TectonicSizeSettings[];
}

// Grille envoyée par le serveur, ligne par ligne (index = ligne * width + colonne)
export interface TectonicPuzzle {
    width: number;
    height: number;
    // Numéro de la zone de chaque case
    regions: number[];
    // Nombre donné au départ, null = à trouver
    cells: (number | null)[];
}

export type TectonicCell = number | null;
