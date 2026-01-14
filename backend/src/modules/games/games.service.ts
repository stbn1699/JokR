import type { Game } from "./game.model.js";
import { GamesRepository } from "./games.repository.js";

export class GamesService {
	constructor(private repo: GamesRepository) {
	}

	async listGames(): Promise<Game[]> {
		return this.repo.list();
	}
}
