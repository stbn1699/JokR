export type GamesTable = {
	id: number;
	code: string;
	designation: string;
};

export type DB = {
	games: GamesTable;
};
