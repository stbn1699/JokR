import type { ColumnType, Generated } from "kysely";

/*
 * Déclarations de type représentant le schéma de la base de données pour Kysely.
 * Chaque Table type décrit les colonnes et leurs types.
 */
export type GamesTable = {
	code: string;
	designation: string;
    base_xp: number;
};

export type UsersTable = {
	id: Generated<string>;
	username: string;
	// null : inscrit avec Google / Discord sans email vérifié
	email: string | null;
	// null : inscrit avec Google / Discord, sans mot de passe
	password: string | null;
    user_level: number;
    user_xp: number;
    // Crédits à miser sur les jeux de hasard (gagnés en finissant des puzzles)
    credits: Generated<number>;
    created_at: Generated<Date>;
    // Dernière activité (requête authentifiée), null si jamais vu depuis l'ajout de la colonne
    last_seen_at: Date | null;
    // Administrateur (page Statistiques) : modifié directement en base, sans redémarrage
    is_admin: Generated<boolean>;
};

// Comptes Google / Discord liés à un joueur
export type UserIdentitiesTable = {
    provider: string;
    provider_user_id: string;
    user_id: string;
    email: string | null;
    display_name: string | null;
    created_at: Generated<Date>;
};

export type GameStatsTable = {
    user_id: string;
    game_code: string;
    games_won: number;
    game_level: number;
    game_xp: number;
}

// Une ligne par partie gagnée (historique, temps, records)
export type GameResultsTable = {
    id: Generated<string>;
    user_id: string;
    game_code: string;
    grid_size: number;
    empty_cells: number;
    duration_ms: number;
    xp: number;
    credits: number;
    finished_at: Generated<Date>;
};

// Défi du jour : une grille par jeu et par jour (puzzle stocké en JSON)
export type DailyChallengesTable = {
    challenge_date: string;
    game_code: string;
    // lu tel quel (JSON déjà décodé), écrit sous forme de texte JSON
    puzzle: ColumnType<unknown, string, string>;
    grid_size: number;
    empty_cells: number;
    created_at: Generated<Date>;
};

// Une réussite du défi par joueur, jeu et jour
export type DailyResultsTable = {
    challenge_date: string;
    game_code: string;
    user_id: string;
    duration_ms: number;
    finished_at: Generated<Date>;
};

// Statistiques : une ligne par partie lancée (invités compris)
export type GameSessionsTable = {
    id: Generated<string>;
    game_id: string | null;
    game_code: string;
    mode: GameMode;
    user_id: string | null;
    logged_in: boolean;
    grid_size: number;
    empty_cells: number;
    device: Device | null;
    started_at: Generated<Date>;
    finished_at: Date | null;
    duration_ms: number | null;
    failed_attempts: Generated<number>;
};

export type GameMode = "free" | "daily" | "replay";
export type Device = "mobile" | "tablet" | "desktop";

export type DB = {
	games: GamesTable;
	users: UsersTable;
    user_identities: UserIdentitiesTable;
    game_stats: GameStatsTable;
    game_results: GameResultsTable;
    daily_challenges: DailyChallengesTable;
    daily_results: DailyResultsTable;
    game_sessions: GameSessionsTable;
};

