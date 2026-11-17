import {sql, type Kysely} from "kysely";
import type {DB} from "../db/schema.js";

export type Ranking = { rank: number; total: number };

/*
 * Classements : XP globale (users), crédits (users) et par jeu (game_stats).
 * Ordre : niveau puis XP décroissants (puis nom, pour départager) ; crédits décroissants pour les crédits ;
 * par jeu : niveaux réussis (mode Niveaux) puis victoires décroissants.
 * `members` (filtre « Amis ») : seulement ces joueurs, chacun avec sa place dans le classement complet
 * (rank, ex aequo compris), sans limite de 20.
 */
export const MEMBERS_LIMIT = 200;

// Niveaux réussis par le joueur de cette ligne de game_stats, dans ce jeu (0 pour un jeu sans mode Niveaux)
const LEVELS_DONE = sql<number>`(select count(*)::int from puzzle_level_progress p
    where p.user_id = game_stats.user_id and p.game_code = game_stats.game_code)`;

export class LeaderboardRepository {
    constructor(private db: Kysely<DB>) {
    }

    async topXp(limit: number, members?: string[]) {
        if (members) {
            return this.db
                .selectFrom(eb => eb.selectFrom("users")
                    .select(["id", "username", "avatar", "user_level as level", "user_level as userLevel", "user_xp as xp",
                        sql<number>`rank() over (order by user_level desc, user_xp desc)`.as("rank")])
                    .as("r"))
                .selectAll()
                .where("id", "in", members)
                .orderBy("rank").orderBy("username")
                .limit(MEMBERS_LIMIT)
                .execute();
        }
        return this.db
            .selectFrom("users")
            .select(["username", "avatar", "user_level as level", "user_level as userLevel", "user_xp as xp"])
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

    async topCredits(limit: number, members?: string[]) {
        if (members) {
            return this.db
                .selectFrom(eb => eb.selectFrom("users")
                    .select(["id", "username", "avatar", "user_level as level", "user_level as userLevel", "user_xp as xp", "credits",
                        sql<number>`rank() over (order by credits desc)`.as("rank")])
                    .as("r"))
                .selectAll()
                .where("id", "in", members)
                .orderBy("rank").orderBy("username")
                .limit(MEMBERS_LIMIT)
                .execute();
        }
        return this.db
            .selectFrom("users")
            .select(["username", "avatar", "user_level as level", "user_level as userLevel", "user_xp as xp", "credits"])
            .orderBy("credits", "desc")
            .orderBy("username", "asc")
            .limit(limit)
            .execute();
    }

    // Place d'un joueur au classement des crédits (null s'il n'existe pas)
    async creditsRankOf(userId: string): Promise<(Ranking & { level: number; credits: number }) | null> {
        const me = await this.db
            .selectFrom("users")
            .select(["user_level", "credits"])
            .where("id", "=", userId)
            .executeTakeFirst();
        if (!me) return null;

        const row = await this.db
            .selectFrom("users")
            .select(eb => [
                eb.fn.countAll<string>().as("total"),
                eb.fn.count<string>("id").filterWhere("credits", ">", me.credits).as("ahead"),
            ])
            .executeTakeFirstOrThrow();
        return {rank: Number(row.ahead) + 1, total: Number(row.total), level: me.user_level, credits: me.credits};
    }

    async topGame(gameCode: string, limit: number, members?: string[]) {
        if (members) {
            return this.db
                .selectFrom(eb => eb.selectFrom("game_stats")
                    .innerJoin("users", "users.id", "game_stats.user_id")
                    .select([
                        "users.id", "users.username", "users.avatar", "users.user_level as userLevel",
                        "game_stats.game_level as level", "game_stats.game_xp as xp", "game_stats.games_won as gamesWon",
                        LEVELS_DONE.as("levels"),
                        sql<number>`rank() over (order by ${LEVELS_DONE} desc, game_stats.games_won desc)`.as("rank"),
                    ])
                    .where("game_stats.game_code", "=", gameCode)
                    .as("r"))
                .selectAll()
                .where("id", "in", members)
                .orderBy("rank").orderBy("username")
                .limit(MEMBERS_LIMIT)
                .execute();
        }
        return this.db
            .selectFrom("game_stats")
            .innerJoin("users", "users.id", "game_stats.user_id")
            .select([
                "users.username",
                "users.avatar",
                // niveau global (contour de l'icône), à côté du niveau sur ce jeu
                "users.user_level as userLevel",
                "game_stats.game_level as level",
                "game_stats.game_xp as xp",
                "game_stats.games_won as gamesWon",
                LEVELS_DONE.as("levels"),
            ])
            .where("game_stats.game_code", "=", gameCode)
            .orderBy(LEVELS_DONE, "desc")
            .orderBy("game_stats.games_won", "desc")
            .orderBy("users.username", "asc")
            .limit(limit)
            .execute();
    }

    // Place d'un joueur au classement d'un jeu (null s'il n'y a jamais gagné)
    async gameRankOf(userId: string, gameCode: string): Promise<(Ranking & { level: number; xp: number; gamesWon: number; levels: number }) | null> {
        const me = await this.db
            .selectFrom("game_stats")
            .select(["game_level", "game_xp", "games_won", LEVELS_DONE.as("levels")])
            .where("user_id", "=", userId)
            .where("game_code", "=", gameCode)
            .executeTakeFirst();
        if (!me) return null;

        // devant lui : plus de niveaux réussis, ou autant et plus de victoires
        const row = await this.db
            .selectFrom(eb => eb.selectFrom("game_stats")
                .select(["games_won", LEVELS_DONE.as("levels")])
                .where("game_code", "=", gameCode)
                .as("s"))
            .select(eb => [
                eb.fn.countAll<string>().as("total"),
                eb.fn.countAll<string>().filterWhere(eb.or([
                    eb("levels", ">", me.levels),
                    eb.and([eb("levels", "=", me.levels), eb("games_won", ">", me.games_won)]),
                ])).as("ahead"),
            ])
            .executeTakeFirstOrThrow();
        return {
            rank: Number(row.ahead) + 1,
            total: Number(row.total),
            level: me.game_level,
            xp: me.game_xp,
            gamesWon: me.games_won,
            levels: me.levels,
        };
    }
}
