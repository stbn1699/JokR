// Paramètres proposés avant une partie de Rikudo (GET /rikudo/settings)
export interface RikudoSizeSettings {
    // Nombre d'anneaux autour de la case centrale
    radius: number;
    // Nombre de cases (36, 60 ou 90)
    size: number;
    minEmptyCells: number;
    maxEmptyCells: number;
    defaultEmptyCells: number;
    // XP gagnée à la résolution, pour chaque nombre de cases à remplir
    xpByEmptyCells: Record<number, number>;
}

export interface RikudoSettings {
    defaultSize: number;
    sizes: RikudoSizeSettings[];
}

// Grille envoyée par le serveur : cases dans l'ordre du plateau (ligne par ligne), null = à trouver
export interface RikudoPuzzle {
    radius: number;
    cells: (number | null)[];
    // Paires de cases voisines dont les nombres se suivent (les points du plateau)
    links: [number, number][];
}

export type RikudoCell = number | null;
