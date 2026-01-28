import type {GameStatsRepository} from "../repository/GameStats.repository.js";
import type {GameStats} from "../models/GameStats.model.js";

export class GameStatsService {
    constructor(private repo: GameStatsRepository) {
    }

    async gameWin(userId: string, gameCode: string, gameXp: number = 10) {
        let stats :GameStats | undefined = await this.getStatsByUserIdAndGameCode(userId, gameCode);

        if (!stats) {
            stats = await this.repo.newRowForPlayerAndGame(userId, gameCode);
        }

        let newXp :number = stats.game_xp + gameXp;
        let level :number = stats.game_level;
        const xpToNextLevel :number = Math.ceil(
            120 * Math.pow(level, 1.4)
        )

        if (newXp >= xpToNextLevel) {
            level++;
            newXp = newXp - xpToNextLevel;
        }

        await this.repo.gameWin(userId, gameCode, level, newXp);
    }

    async getStatsByUserId(userId: string): Promise<GameStats[]> {
        return this.repo.getStatsByUserId(userId);
    }

    async getStatsByUserIdAndGameCode(userId: string, gameCode: string): Promise<GameStats | undefined> {
        return this.repo.getStatsByUserIdAndGameCode(userId, gameCode);
    }
}
