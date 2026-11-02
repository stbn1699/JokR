import type {Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import {addXp} from "../utils/leveling.js";

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
     */
    async recordWin(userId: string, gameCode: string, xpGained: number, result: GameResult, creditsGained = 0): Promise<{ personalBest: boolean }> {
        return this.db.transaction().execute(async (trx) => {
            // Crée la ligne de stats si c'est la première victoire sur ce jeu
            await trx
                .insertInto("game_stats")
                .values({user_id: userId, game_code: gameCode, games_won: 0, game_level: 1, game_xp: 0})
                .onConflict((oc) => oc.columns(["user_id", "game_code"]).doNothing())
                .execute();

            const user = await trx
                .selectFrom("users")
                .select(["user_level", "user_xp"])
                .where("id", "=", userId)
                .forUpdate()
                .executeTakeFirstOrThrow();

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
                .set(eb => ({user_level: newUser.level, user_xp: newUser.xp, credits: eb("credits", "+", creditsGained)}))
                .where("id", "=", userId)
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

            const best = await trx
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

            const previousBest = best?.best ?? null;
            return {personalBest: previousBest === null || result.durationMs < previousBest};
        });
    }
}
