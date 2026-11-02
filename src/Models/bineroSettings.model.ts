// Paramètres proposés avant une partie de Binero (GET /binero/settings)
export interface BineroSizeSettings {
    size: number;
    minEmptyCells: number;
    maxEmptyCells: number;
    defaultEmptyCells: number;
    // XP gagnée à la résolution, pour chaque nombre de cases à remplir
    xpByEmptyCells: Record<number, number>;
    // Crédits gagnés (1 à 3) pour chaque nombre de cases à remplir
    creditsByEmptyCells: Record<number, number>;
}

export interface BineroSettings {
    defaultSize: number;
    sizes: BineroSizeSettings[];
}

// Case d'une grille de Binero : 0, 1 ou vide
export type BineroCell = 0 | 1 | null;
