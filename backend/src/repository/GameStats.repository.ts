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

    async getStatsByUserIdAndGameCode(userId :string, gameCode :string) :Promise<GameStats | undefined> {
        return this.db
            .selectFrom("game_stats")
            .selectAll()
            .where("user_id", "=", userId)
            .where("game_code", "=", gameCode)
            .executeTakeFirst();
    }

    async gameWin(userId: string, gameCode: string, gameLevel: number, gameXp: number) {
        await this.db
            .updateTable("game_stats")
            .set((eb) => ({
                games_won: eb("games_won", "+", 1),
                game_level: gameLevel,
                game_xp: gameXp,
            }))
            .where("user_id", "=", userId)
            .where("game_code", "=", gameCode)
            .execute();
    }

    async newRowForPlayerAndGame(userId: string, gameCode: string): Promise<GameStats> {
        return await this.db
            .insertInto("game_stats")
            .values({
                user_id: userId,
                game_code: gameCode,
                games_won: 0,
                game_level: 1,
                game_xp: 0,
            })
            .returningAll()
            .executeTakeFirstOrThrow();
    }
}