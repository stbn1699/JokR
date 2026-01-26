export type User = {
	id: string;
	username: string;
	email: string;
	password: string; // hashed password
};

export type NewUser = {
	username: string;
	email: string;
	password: string; // already hashed (frontend hashed once)
};
