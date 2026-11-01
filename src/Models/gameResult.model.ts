// Réponse du serveur à une grille validée
export interface WinResult {
    // XP gagnée (absente si le joueur n'est pas connecté)
    xp?: number;
    // Temps de la partie, mesuré par le serveur (de la génération à la validation)
    durationMs: number;
    // Meilleur temps du joueur sur cette configuration (jeu, taille, cases à remplir)
    personalBest?: boolean;
}

// Une partie gagnée, dans l'historique du joueur (GET /users/me/results)
export interface RecentResult {
    game_code: string;
    designation: string;
    grid_size: number;
    empty_cells: number;
    duration_ms: number;
    xp: number;
    finished_at: string;
}

// Partie en cours côté serveur (GET /<jeu>/games/:gameId), pour la reprendre
export interface GameStatus<Grid> {
    grid: Grid;
    elapsedMs: number;
}
