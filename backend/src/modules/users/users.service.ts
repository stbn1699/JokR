import { UsersRepository } from "./users.repository.js";
import type { NewUser, User } from "./user.model.js";
import bcrypt from "bcrypt";

export class UsersService {
	constructor(private repo: UsersRepository) {}

	async register(user: NewUser): Promise<User> {
		// Hash again before storing
		const saltRounds = 10;
		const doubleHashed = await bcrypt.hash(user.password, saltRounds);
		return this.repo.create({ ...user, password: doubleHashed });
	}

	async authenticate(identifier: string, password: string): Promise<User | null> {
		// identifier can be email or username
		const user = identifier.includes('@') ? await this.repo.findByEmail(identifier) : await this.repo.findByUsername(identifier);
		if (!user) return null;
		const ok = await bcrypt.compare(password, user.password);
		return ok ? user : null;
	}
}
