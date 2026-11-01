import {type Kysely, sql} from "kysely";
import type {DB} from "../db/schema.js";

export type DailyChallenge = {
    puzzle: unknown;
    grid_size: number;
    empty_cells: number;
};

export type DailyRanking = { rank: number; total: number };

/*
 * Défi du jour : grilles (daily_challenges) et réussites (daily_results).
 */
export class DailyRepository {
    constructor(private db: Kysely<DB>) {
    }

    async findChallenge(date: string, gameCode: string): Promise<DailyChallenge | undefined> {
        return this.db
            .selectFrom("daily_challenges")
            .select(["puzzle", "grid_size", "empty_cells"])
            .where("challenge_date", "=", date)
            .where("game_code", "=", gameCode)
            .executeTakeFirst();
    }

    // Enregistre la grille du jour ; si une autre requête l'a créée entre-temps, on garde la sienne
    async insertChallenge(date: string, gameCode: string, puzzle: unknown, gridSize: number, emptyCells: number) {
        await this.db
            .insertInto("daily_challenges")
            .values({
                challenge_date: date,
                game_code: gameCode,
                puzzle: JSON.stringify(puzzle),
                grid_size: gridSize,
                empty_cells: emptyCells,
            })
            .onConflict(oc => oc.columns(["challenge_date", "game_code"]).doNothing())
            .execute();
    }

    async findResult(date: string, gameCode: string, userId: string): Promise<{ duration_ms: number } | undefined> {
        return this.db
            .selectFrom("daily_results")
            .select("duration_ms")
            .where("challenge_date", "=", date)
            .where("game_code", "=", gameCode)
            .where("user_id", "=", userId)
            .executeTakeFirst();
    }

    // Enregistre une réussite ; false si le joueur avait déjà réussi le défi ce jour-là
    async insertResult(date: string, gameCode: string, userId: string, durationMs: number): Promise<boolean> {
        const inserted = await this.db
            .insertInto("daily_results")
            .values({challenge_date: date, game_code: gameCode, user_id: userId, duration_ms: durationMs})
            .onConflict(oc => oc.columns(["challenge_date", "game_code", "user_id"]).doNothing())
            .returning("user_id")
            .executeTakeFirst();
        return inserted !== undefined;
    }

    // Place d'un temps dans le classement du jour (1 = le plus rapide)
    async rankOf(date: string, gameCode: string, durationMs: number): Promise<DailyRanking> {
        const row = await this.db
            .selectFrom("daily_results")
            .select(eb => [
                eb.fn.countAll<string>().as("total"),
                eb.fn.count<string>("user_id").filterWhere("duration_ms", "<", durationMs).as("faster"),
            ])
            .where("challenge_date", "=", date)
            .where("game_code", "=", gameCode)
            .executeTakeFirstOrThrow();
        return {rank: Number(row.faster) + 1, total: Number(row.total)};
    }

    /**
     * Défis des jours précédents (avant `beforeDate`), les plus récents d'abord, sur `days` jours au plus,
     * avec le nombre de joueurs classés. Les dates sont renvoyées en texte (AAAA-MM-JJ).
     */
    async listPast(beforeDate: string, days: number) {
        const dates = await this.db
            .selectFrom("daily_challenges")
            .select(sql<string>`challenge_date::text`.as("date"))
            .where("challenge_date", "<", beforeDate)
            .groupBy("challenge_date")
            .orderBy("challenge_date", "desc")
            .limit(days)
            .execute();
        if (dates.length === 0) return [];

        return this.db
            .selectFrom("daily_challenges as c")
            .leftJoin("daily_results as r", join => join
                .onRef("r.challenge_date", "=", "c.challenge_date")
                .onRef("r.game_code", "=", "c.game_code"))
            .select(eb => [
                sql<string>`c.challenge_date::text`.as("date"),
                "c.game_code",
                "c.grid_size",
                "c.empty_cells",
                eb.fn.count<string>("r.user_id").as("players"),
            ])
            .where(sql<string>`c.challenge_date::text`, "in", dates.map(d => d.date))
            .groupBy(["c.challenge_date", "c.game_code", "c.grid_size", "c.empty_cells"])
            .orderBy("c.challenge_date", "desc")
            .orderBy("c.game_code", "desc")
            .execute();
    }

    // Réussites d'un joueur sur une liste de jours
    async resultsOf(userId: string, dates: string[]) {
        if (dates.length === 0) return [];
        return this.db
            .selectFrom("daily_results")
            .select([sql<string>`challenge_date::text`.as("date"), "game_code", "duration_ms"])
            .where("user_id", "=", userId)
            .where(sql<string>`challenge_date::text`, "in", dates)
            .execute();
    }

    // Meilleurs temps du jour
    async leaderboard(date: string, gameCode: string, limit: number) {
        return this.db
            .selectFrom("daily_results")
            .innerJoin("users", "users.id", "daily_results.user_id")
            .select(["users.username", "daily_results.duration_ms"])
            .where("daily_results.challenge_date", "=", date)
            .where("daily_results.game_code", "=", gameCode)
            .orderBy("daily_results.duration_ms", "asc")
            .orderBy("daily_results.finished_at", "asc")
            .limit(limit)
            .execute();
    }
}
