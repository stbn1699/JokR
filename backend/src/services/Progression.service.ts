import {achievements} from "./achievements/index.js";
import {puzzleWon} from "./achievements/events.js";
import {sql, type Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import {addXp} from "../utils/leveling.js";
import {dailyDate} from "../utils/dailyDate.js";
import {nextStreak, streakBonus, streakBonusPercent} from "../utils/streak.js";

// Flamme après cette victoire : jours de suite, bonus appliqué, et ce qu'il a rapporté
export type StreakWin = { days: number; best: number; percent: number; xpBonus: number; creditsBonus: number; extended: boolean };
export type RecordedWin = { personalBest: boolean; xp: number; credits: number; streak: StreakWin };

// Configuration et durée d'une partie gagnée
export type GameResult = {
    gridSize: number;
    emptyCells: number;
    durationMs: number;
};

/*
 * Enregistre une victoire : +1 victoire et XP sur le jeu, XP et crédits sur le joueur,
 * et une ligne d'historique (temps de la partie, XP et crédits gagnés).
 *
 * Tout se fait dans une transaction avec les lignes verrouillées (SELECT ... FOR UPDATE) :
 * deux victoires simultanées sont appliquées l'une après l'autre au lieu de s'écraser.
 */
export class ProgressionService {
    constructor(private db: Kysely<DB>) {
    }

    /**
     * Retourne `personalBest` : true si c'est le meilleur temps du joueur sur cette configuration
     * (même jeu, même taille, même nombre de cases à remplir).
     * `xp` et `credits` : gains réels, bonus de la flamme compris.
     */
    async recordWin(userId: string, gameCode: string, baseXp: number, result: GameResult, baseCredits = 0): Promise<RecordedWin> {
        const win = await this.save(userId, gameCode, baseXp, result, baseCredits);
        void achievements.track(userId, ctx => puzzleWon(ctx, {gameCode, gridSize: result.gridSize, credits: win.credits}));
        return win;
    }

    private async save(userId: string, gameCode: string, baseXp: number, result: GameResult, baseCredits: number): Promise<RecordedWin> {
        const today = dailyDate();
        return this.db.transaction().execute(async (trx) => {
            // Crée la ligne de stats si c'est la première victoire sur ce jeu
            await trx
                .insertInto("game_stats")
                .values({user_id: userId, game_code: gameCode, games_won: 0, game_level: 1, game_xp: 0})
                .onConflict((oc) => oc.columns(["user_id", "game_code"]).doNothing())
                .execute();

            const user = await trx
                .selectFrom("users")
                .select(["user_level", "user_xp", "streak_days", "streak_best", "streak_xp_carry", "streak_credits_carry",
                    sql<string | null>`streak_last_date::text`.as("streak_last")])
                .where("id", "=", userId)
                .forUpdate()
                .executeTakeFirstOrThrow();

            // Flamme : la victoire compte pour aujourd'hui, et son bonus suit la série à jour
            const days = nextStreak(user.streak_days, user.streak_last, today);
            const best = Math.max(user.streak_best, days);
            const xpBonus = streakBonus(baseXp, days, user.streak_xp_carry);
            const creditsBonus = streakBonus(baseCredits, days, user.streak_credits_carry);
            const xpGained = baseXp + xpBonus.bonus;
            const creditsGained = baseCredits + creditsBonus.bonus;

            const stats = await trx
                .selectFrom("game_stats")
                .select(["game_level", "game_xp"])
                .where("user_id", "=", userId)
                .where("game_code", "=", gameCode)
                .forUpdate()
                .executeTakeFirstOrThrow();

            const newUser = addXp(user.user_level, user.user_xp, xpGained);
            const newStats = addXp(stats.game_level, stats.game_xp, xpGained);

            await trx
                .updateTable("users")
                .set(eb => ({
                    user_level: newUser.level, user_xp: newUser.xp, credits: eb("credits", "+", creditsGained),
                    streak_days: days, streak_best: best, streak_last_date: today,
                    streak_xp_carry: xpBonus.carry, streak_credits_carry: creditsBonus.carry,
                }))
                .where("id", "=", userId)
                .execute();

            // Grille faite : le rappel du jour n'a plus lieu d'être
            await trx.updateTable("notifications")
                .set({read_at: sql`now()`})
                .where("user_id", "=", userId)
                .where("kind", "=", "streak_reminder")
                .where("read_at", "is", null)
                .execute();

            await trx
                .updateTable("game_stats")
                .set((eb) => ({
                    games_won: eb("games_won", "+", 1),
                    game_level: newStats.level,
                    game_xp: newStats.xp,
                }))
                .where("user_id", "=", userId)
                .where("game_code", "=", gameCode)
                .execute();

            const bestTime = await trx
                .selectFrom("game_results")
                .select(eb => eb.fn.min("duration_ms").as("best"))
                .where("user_id", "=", userId)
                .where("game_code", "=", gameCode)
                .where("grid_size", "=", result.gridSize)
                .where("empty_cells", "=", result.emptyCells)
                .executeTakeFirst();

            await trx
                .insertInto("game_results")
                .values({
                    user_id: userId,
                    game_code: gameCode,
                    grid_size: result.gridSize,
                    empty_cells: result.emptyCells,
                    duration_ms: result.durationMs,
                    xp: xpGained,
                    credits: creditsGained,
                })
                .execute();

            const previousBest = bestTime?.best ?? null;
            return {
                personalBest: previousBest === null || result.durationMs < previousBest,
                xp: xpGained,
                credits: creditsGained,
                streak: {
                    days, best, percent: streakBonusPercent(days),
                    xpBonus: xpBonus.bonus, creditsBonus: creditsBonus.bonus,
                    extended: user.streak_last !== today,
                },
            };
        });
    }
}
