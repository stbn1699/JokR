import type { Generated } from "kysely";

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

export type DB = {
	games: GamesTable;
	users: UsersTable;
    game_stats: GameStatsTable;
};

