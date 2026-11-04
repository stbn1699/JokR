import {sql, type Kysely} from "kysely";
import type {DB} from "../db/schema.js";

/*
 * Profil public d'un joueur (page /joueur/:pseudo) : ce que tout le monde peut voir.
 * Jamais d'email, de date de dernière activité ni de rôle administrateur.
 */
export class PlayersRepository {
    constructor(private db: Kysely<DB>) {
    }

    async byUsername(username: string) {
        return this.db
            .selectFrom("users")
            .select(["id", "username", "avatar", "user_level as level", "user_xp as xp", "credits", "created_at as createdAt",
                "show_stats as showStats", "show_history as showHistory"])
            .where("username", "=", username)
            .executeTakeFirst();
    }

    /*
     * Chaque jeu, même jamais gagné : niveau, XP et victoires sur ce jeu, et meilleur temps
     * (avec la taille de grille et l'aide de cette partie-là).
     */
    async games(userId: string) {
        const best = this.db
            .selectFrom("game_results")
            .select(["game_code", "duration_ms", "grid_size", "empty_cells"])
            .distinctOn("game_code")
            .where("user_id", "=", userId)
            .orderBy("game_code")
            .orderBy("duration_ms", "asc")
            .as("best");

        return this.db
            .selectFrom("games")
            .leftJoin("game_stats", join => join
                .onRef("game_stats.game_code", "=", "games.code")
                .on("game_stats.user_id", "=", userId))
            .leftJoin(best, "best.game_code", "games.code")
            .select([
                "games.code",
                "games.designation as name",
                sql<number>`coalesce(game_stats.game_level, 1)`.as("level"),
                sql<number>`coalesce(game_stats.game_xp, 0)`.as("xp"),
                sql<number>`coalesce(game_stats.games_won, 0)`.as("wins"),
                "best.duration_ms as bestMs",
                "best.grid_size as bestGridSize",
                "best.empty_cells as bestEmptyCells",
            ])
            .orderBy(sql`coalesce(game_stats.games_won, 0)`, "desc")
            .orderBy("games.designation", "asc")
            .execute();
    }

    // Défis du jour réussis, et gagnés (meilleur temps du jour sur ce jeu, ex aequo compris)
    async daily(userId: string) {
        const row = await this.db
            .selectFrom("daily_results as d")
            .select(eb => [
                eb.fn.countAll<string>().as("completions"),
                eb.fn.countAll<string>().filterWhere(({not, exists, selectFrom}) => not(exists(
                    selectFrom("daily_results as x")
                        .select(sql`1`.as("one"))
                        .whereRef("x.challenge_date", "=", "d.challenge_date")
                        .whereRef("x.game_code", "=", "d.game_code")
                        .whereRef("x.duration_ms", "<", "d.duration_ms"),
                ))).as("firsts"),
            ])
            .where("d.user_id", "=", userId)
            .executeTakeFirstOrThrow();
        return {completions: Number(row.completions), firsts: Number(row.firsts)};
    }

    // Dernières victoires, les plus récentes d'abord
    async recent(userId: string, limit: number) {
        return this.db
            .selectFrom("game_results")
            .innerJoin("games", "games.code", "game_results.game_code")
            .select([
                "game_results.game_code as code",
                "games.designation as name",
                "game_results.grid_size as gridSize",
                "game_results.empty_cells as emptyCells",
                "game_results.duration_ms as durationMs",
                "game_results.finished_at as finishedAt",
            ])
            .where("game_results.user_id", "=", userId)
            .orderBy("game_results.finished_at", "desc")
            .limit(limit)
            .execute();
    }
}
