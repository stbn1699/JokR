// Réponse du serveur à une grille validée
export interface WinResult {
    // XP gagnée (absente si le joueur n'est pas connecté)
    xp?: number;
    // Crédits gagnés (1 à 3 selon la difficulté, absents si le joueur n'est pas connecté)
    credits?: number;
    // XP et crédits multipliés (2 au défi du jour, 1 sinon)
    rewardMultiplier?: number;
    // Temps de la partie, mesuré par le serveur (de la génération à la validation)
    durationMs: number;
    // Meilleur temps du joueur sur cette configuration (jeu, taille, cases à remplir)
    personalBest?: boolean;
    // Défi du jour : place du joueur ; counted = false si le défi était déjà réussi aujourd'hui
    daily?: { counted: boolean; rank: number; total: number };
}

// Une partie gagnée, dans l'historique du joueur (GET /users/me/results)
export interface RecentResult {
    game_code: string;
    designation: string;
    grid_size: number;
    empty_cells: number;
    duration_ms: number;
    xp: number;
    credits: number;
    finished_at: string;
}

// Partie en cours côté serveur (GET /<jeu>/games/:gameId), pour la reprendre
export interface GameStatus<Grid> {
    grid: Grid;
    elapsedMs: number;
}
