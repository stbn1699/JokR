import type {GameStatsRepository} from "../repository/GameStats.repository.js";
import type {GameStats} from "../models/GameStats.model.js";

export class GameStatsService {
    constructor(private repo: GameStatsRepository) {
    }

    async gameWin(userId: string, gameCode: string) {
        await this.repo.gameWin(userId, gameCode);
    }

    async getStatsByUserId(userId: string): Promise<GameStats[]> {
        return this.repo.getStatsByUserId(userId);
    }

}
