import type {Kysely} from "kysely";
import type {DB} from "../db/schema.js";

export type RecentResult = {
    game_code: string;
    designation: string;
    grid_size: number;
    empty_cells: number;
    duration_ms: number;
    xp: number;
    finished_at: Date;
};

/*
 * Historique des parties gagnées (table game_results).
 * L'écriture se fait dans ProgressionService, en même temps que l'XP.
 */
export class GameResultsRepository {
    constructor(private db: Kysely<DB>) {
    }

    // Parties gagnées par un joueur, les plus récentes d'abord (par pages)
    async listRecent(userId: string, limit: number, offset = 0): Promise<RecentResult[]> {
        return this.db
            .selectFrom("game_results")
            .innerJoin("games", "games.code", "game_results.game_code")
            .select([
                "game_results.game_code",
                "games.designation",
                "game_results.grid_size",
                "game_results.empty_cells",
                "game_results.duration_ms",
                "game_results.xp",
                "game_results.credits",
                "game_results.finished_at",
            ])
            .where("game_results.user_id", "=", userId)
            .orderBy("game_results.finished_at", "desc")
            .limit(limit)
            .offset(offset)
            .execute();
    }
}
