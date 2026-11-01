// Noms des jeux du défi du jour et description de leur grille (taille, cases à remplir)
export const DAILY_GAME_NAMES: Record<string, string> = {SUDOKU: "Sudoku", BINERO: "Binero", RIKUDO: "Rikudo"};

export function dailyGridLabel(code: string, size: number, emptyCells: number): string {
    // Rikudo : size = nombre de cases du plateau
    return code === "RIKUDO" ? `${size} cases · ${emptyCells} à remplir` : `${size}×${size} · ${emptyCells} cases`;
}
