import type {Kysely} from "kysely";
import type {GameStats} from "../models/GameStats.model.js";
import type {DB} from "../db/schema.js";


export class GameStatsRepository {
    constructor(private db: Kysely<DB>) {
    }

    async getStatsByUserId(userId: string): Promise<GameStats[]> {
        return this.db
            .selectFrom("game_stats")
            .selectAll()
            .where("user_id", "=", userId)
            .execute();
    }

    async gameWin(userId: string, gameId: number): Promise<GameStats> {
        // We run the update inside a transaction to avoid races.
        return this.db.transaction().execute(async (trx) => {
            // First try to fetch the existing row
            const existing = await trx
                .selectFrom("game_stats")
                .selectAll()
                .where("user_id", "=", userId)
                .where("game_id", "=", gameId)
                .executeTakeFirst();

            if (existing) {
                // Increment games_won using the current value
                const updated = await trx
                    .updateTable("game_stats")
                    .set({ games_won: existing.games_won + 1 })
                    .where("user_id", "=", userId)
                    .where("game_id", "=", gameId)
                    .returningAll()
                    .execute();

                return updated[0] as GameStats;
            }

            // If no existing row, insert a new one with games_won = 1 and games_played = 0
            const inserted = await trx
                .insertInto("game_stats")
                .values({ user_id: userId, game_id: gameId, games_won: 1 })
                .returningAll()
                .execute();

            return inserted[0] as GameStats;
        });
    }
}
