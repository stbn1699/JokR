// Paramètres proposés avant une partie (GET /sudoku/settings)
export interface SudokuSettings {
    minEmptyCells: number;
    maxEmptyCells: number;
    defaultEmptyCells: number;
    // XP gagnée à la résolution, pour chaque nombre de cases vides
    xpByEmptyCells: Record<number, number>;
    // Crédits gagnés (1 à 3) pour chaque nombre de cases à remplir
    creditsByEmptyCells: Record<number, number>;
}
