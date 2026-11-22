// XP et crédits multipliés au défi du jour (même valeur que DAILY_REWARD_MULTIPLIER côté serveur)
export const DAILY_REWARD_MULTIPLIER = 2;

// Noms des jeux du défi du jour et description de leur grille (taille, cases à remplir)
export const DAILY_GAME_NAMES: Record<string, string> = {SUDOKU: "Sudoku", BINERO: "Binero", RIKUDO: "Rikudo", TECTONIC: "Tectonic", GALAXIES: "Galaxies", SHIKAKU: "Shikaku", QUEENS: "Queens", TRACE: "Tracé", DEVIMOT: "Devimot", ECHELLE: "Échelle", MOTSMELES: "Mots mêlés", MOTSACASER: "Mots à caser", COLORIA: "Coloria"};

export function dailyGridLabel(code: string, size: number, emptyCells: number): string {
    // Rikudo : size = nombre de cases du plateau ; Galaxies, Shikaku et Queens : emptyCells = aide donnée
    if (code === "RIKUDO") return `${size} cases · ${emptyCells} à remplir`;
    if (code === "GALAXIES") return `${size}×${size} · ${emptyCells === 0 ? "sans aide" : `${emptyCells} murs donnés`}`;
    if (code === "SHIKAKU") return `${size}×${size} · ${emptyCells === 0 ? "sans aide" : `${emptyCells} rectangles donnés`}`;
    if (code === "QUEENS") return `${size}×${size} · ${emptyCells === 0 ? "sans aide" : `${emptyCells} dames données`}`;
    if (code === "TRACE") return `${size}×${size} · ${emptyCells === 0 ? "sans aide" : `${emptyCells} numéro${emptyCells > 1 ? "s" : ""} en plus`}`;
    return `${size}×${size} · ${emptyCells} cases`;
}
