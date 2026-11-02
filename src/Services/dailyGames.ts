// XP et crédits multipliés au défi du jour (même valeur que DAILY_REWARD_MULTIPLIER côté serveur)
export const DAILY_REWARD_MULTIPLIER = 2;

// Noms des jeux du défi du jour et description de leur grille (taille, cases à remplir)
export const DAILY_GAME_NAMES: Record<string, string> = {SUDOKU: "Sudoku", BINERO: "Binero", RIKUDO: "Rikudo", TECTONIC: "Tectonic", GALAXIES: "Galaxies"};

export function dailyGridLabel(code: string, size: number, emptyCells: number): string {
    // Rikudo : size = nombre de cases du plateau ; Galaxies : emptyCells = murs donnés en aide
    if (code === "RIKUDO") return `${size} cases · ${emptyCells} à remplir`;
    if (code === "GALAXIES") return `${size}×${size} · ${emptyCells === 0 ? "sans aide" : `${emptyCells} murs donnés`}`;
    return `${size}×${size} · ${emptyCells} cases`;
}
