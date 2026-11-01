import type {Kysely} from "kysely";
import type {DB} from "../db/schema.js";

export type Ranking = { rank: number; total: number };

/*
 * Classements : XP globale (users) et par jeu (game_stats).
 * Ordre : niveau puis XP décroissants (puis nom, pour départager).
 */
export class LeaderboardRepository {
    constructor(private db: Kysely<DB>) {
    }

    async topXp(limit: number) {
        return this.db
            .selectFrom("users")
            .select(["username", "user_level as level", "user_xp as xp"])
            .orderBy("user_level", "desc")
            .orderBy("user_xp", "desc")
            .orderBy("username", "asc")
            .limit(limit)
            .execute();
    }

    // Place d'un joueur au classement XP (null s'il n'existe pas)
    async xpRankOf(userId: string): Promise<(Ranking & { level: number; xp: number }) | null> {
        const me = await this.db
            .selectFrom("users")
            .select(["user_level", "user_xp"])
            .where("id", "=", userId)
            .executeTakeFirst();
        if (!me) return null;

        const row = await this.db
            .selectFrom("users")
            .select(eb => [
                eb.fn.countAll<string>().as("total"),
                eb.fn.count<string>("id").filterWhere(eb.or([
                    eb("user_level", ">", me.user_level),
                    eb.and([eb("user_level", "=", me.user_level), eb("user_xp", ">", me.user_xp)]),
                ])).as("ahead"),
            ])
            .executeTakeFirstOrThrow();
        return {rank: Number(row.ahead) + 1, total: Number(row.total), level: me.user_level, xp: me.user_xp};
    }

    async topGame(gameCode: string, limit: number) {
        return this.db
            .selectFrom("game_stats")
            .innerJoin("users", "users.id", "game_stats.user_id")
            .select([
                "users.username",
                "game_stats.game_level as level",
                "game_stats.game_xp as xp",
                "game_stats.games_won as gamesWon",
            ])
            .where("game_stats.game_code", "=", gameCode)
            .orderBy("game_stats.game_level", "desc")
            .orderBy("game_stats.game_xp", "desc")
            .orderBy("users.username", "asc")
            .limit(limit)
            .execute();
    }

    // Place d'un joueur au classement d'un jeu (null s'il n'y a jamais gagné)
    async gameRankOf(userId: string, gameCode: string): Promise<(Ranking & { level: number; xp: number; gamesWon: number }) | null> {
        const me = await this.db
            .selectFrom("game_stats")
            .select(["game_level", "game_xp", "games_won"])
            .where("user_id", "=", userId)
            .where("game_code", "=", gameCode)
            .executeTakeFirst();
        if (!me) return null;

        const row = await this.db
            .selectFrom("game_stats")
            .select(eb => [
                eb.fn.countAll<string>().as("total"),
                eb.fn.count<string>("user_id").filterWhere(eb.or([
                    eb("game_level", ">", me.game_level),
                    eb.and([eb("game_level", "=", me.game_level), eb("game_xp", ">", me.game_xp)]),
                ])).as("ahead"),
            ])
            .where("game_code", "=", gameCode)
            .executeTakeFirstOrThrow();
        return {
            rank: Number(row.ahead) + 1,
            total: Number(row.total),
            level: me.game_level,
            xp: me.game_xp,
            gamesWon: me.games_won,
        };
    }
}
