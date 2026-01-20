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

export type DB = {
	games: GamesTable;
	users: UsersTable;
};
