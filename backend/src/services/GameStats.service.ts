import type {GameStatsRepository} from "../repository/GameStats.repository.js";
import type {GameStats} from "../models/GameStats.model.js";

/*
 * Service de lecture des statistiques de jeu.
 * L'enregistrement des victoires est fait par ProgressionService (transaction).
 */
export class GameStatsService {
    constructor(private repo: GameStatsRepository) {
    }

    async getStatsByUserId(userId: string): Promise<GameStats[]> {
        return this.repo.getStatsByUserId(userId);
    }
}
