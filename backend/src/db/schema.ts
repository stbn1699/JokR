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
	email: string;
	password: string;
    user_level: number;
    user_xp: number;
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

export type DB = {
	games: GamesTable;
	users: UsersTable;
    game_stats: GameStatsTable;
    game_results: GameResultsTable;
    daily_challenges: DailyChallengesTable;
    daily_results: DailyResultsTable;
};

