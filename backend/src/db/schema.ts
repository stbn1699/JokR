import type { Generated } from "kysely";

export type GamesTable = {
	id: Generated<number>;
	code: string;
	designation: string;
};

export type UsersTable = {
	id: Generated<string>; // uuid
	username: string;
	email: string;
	password: string; // hashed password
};

export type GameStatsTable = {
    user_id: string; // uuid
    game_id: number;
    games_won: number;
}

export type DB = {
	games: GamesTable;
	users: UsersTable;
    game_stats: GameStatsTable;
};

