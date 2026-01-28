import type {Game} from "../models/Game.model.js";
import {GamesRepository} from "../repository/Games.repository.js";

export class GamesService {
    constructor(private repo: GamesRepository) {
    }

    async listGames(): Promise<Game[]> {
        return this.repo.list();
    }
}
