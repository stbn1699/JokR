import {type Kysely} from "kysely";
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
        return this.db
            .insertInto("game_stats")
            .values({user_id: userId, game_id: gameId, games_won: 1})
            .onConflict((oc) =>
                oc.columns(["user_id", "game_id"]).doUpdateSet((eb) => ({
                    games_won: eb("game_stats.games_won", "+", 1),
                })),
            )
            .returningAll()
            .executeTakeFirstOrThrow();
    }
}