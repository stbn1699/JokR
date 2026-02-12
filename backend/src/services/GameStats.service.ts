import type {GameStatsRepository} from "../repository/GameStats.repository.js";
import type {GameStats} from "../models/GameStats.model.js";

/*
 * Service métier pour les statistiques de jeu
 * - gameWin : calcule le nouvel XP et niveau, crée une ligne si nécessaire puis met à jour
 * - getStatsByUserId / getStatsByUserIdAndGameCode : wrappers vers le repository
 */
export class GameStatsService {
    constructor(private repo: GameStatsRepository) {
    }

    async gameWin(userId: string, gameCode: string, gameXp: number = 10) {
        // Récupère les stats existantes pour utilisateur+jeu
        let stats :GameStats | undefined = await this.getStatsByUserIdAndGameCode(userId, gameCode);

        // Si aucune ligne, on en crée une initiale
        if (!stats) {
            stats = await this.repo.newRowForPlayerAndGame(userId, gameCode);
        }

        // Calcul du nouvel XP et du niveau
        let newXp :number = stats.game_xp + gameXp;
        let level :number = stats.game_level;
        const xpToNextLevel :number = Math.ceil(
            120 * Math.pow(level, 1.4)
        )

        // Si on dépasse le seuil, on augmente le niveau et on soustrait l'XP consommée
        if (newXp >= xpToNextLevel) {
            level++;
            newXp = newXp - xpToNextLevel;
        }

        // Persistance via le repository
        await this.repo.gameWin(userId, gameCode, level, newXp);
    }

    async getStatsByUserId(userId: string): Promise<GameStats[]> {
        return this.repo.getStatsByUserId(userId);
    }

    async getStatsByUserIdAndGameCode(userId: string, gameCode: string): Promise<GameStats | undefined> {
        return this.repo.getStatsByUserIdAndGameCode(userId, gameCode);
    }
}
