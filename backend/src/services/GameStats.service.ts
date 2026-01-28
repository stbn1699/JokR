import type {GameStatsRepository} from "../repository/GameStats.repository.js";

export class GameStatsService {
    constructor(private repo: GameStatsRepository) {
    }

    async gameWin(userId: string, gameId: number): Promise<any> {
        return this.repo.gameWin(userId, gameId);
    }

    async getStatsByUserId(userId: string): Promise<any> {
        return this.repo.getStatsByUserId(userId);
    }

}
