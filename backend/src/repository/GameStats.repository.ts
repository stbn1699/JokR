import {type Kysely} from "kysely";
import type {GameStats} from "../models/GameStats.model.js";
import type {DB} from "../db/schema.js";

/*
 * Repository pour la table game_stats
 * Lecture des statistiques par utilisateur (les écritures passent par ProgressionService).
 */
export class GameStatsRepository {
    constructor(private db: Kysely<DB>) {
    }

    // Récupère toutes les statistiques pour un utilisateur
    async getStatsByUserId(userId: string): Promise<GameStats[]> {
        return this.db
            .selectFrom("game_stats")
            .selectAll()
            .where("user_id", "=", userId)
            .execute();
    }
}
