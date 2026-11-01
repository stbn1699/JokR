// Paramètres proposés avant une partie (GET /sudoku/settings)
export interface SudokuSettings {
    minEmptyCells: number;
    maxEmptyCells: number;
    defaultEmptyCells: number;
    // XP gagnée à la résolution, pour chaque nombre de cases vides
    xpByEmptyCells: Record<number, number>;
}
