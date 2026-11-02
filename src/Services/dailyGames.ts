// XP et crédits multipliés au défi du jour (même valeur que DAILY_REWARD_MULTIPLIER côté serveur)
export const DAILY_REWARD_MULTIPLIER = 2;

// Noms des jeux du défi du jour et description de leur grille (taille, cases à remplir)
export const DAILY_GAME_NAMES: Record<string, string> = {SUDOKU: "Sudoku", BINERO: "Binero", RIKUDO: "Rikudo", TECTONIC: "Tectonic"};

export function dailyGridLabel(code: string, size: number, emptyCells: number): string {
    // Rikudo : size = nombre de cases du plateau
    return code === "RIKUDO" ? `${size} cases · ${emptyCells} à remplir` : `${size}×${size} · ${emptyCells} cases`;
}
