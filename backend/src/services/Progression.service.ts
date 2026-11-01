import type {Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import {addXp} from "../utils/leveling.js";

/*
 * Enregistre une victoire : +1 victoire et XP sur le jeu, XP sur le joueur.
 *
 * Tout se fait dans une transaction avec les lignes verrouillées (SELECT ... FOR UPDATE) :
 * deux victoires simultanées sont appliquées l'une après l'autre au lieu de s'écraser.
 */
export class ProgressionService {
    constructor(private db: Kysely<DB>) {
    }

    async recordWin(userId: string, gameCode: string, xpGained: number): Promise<void> {
        await this.db.transaction().execute(async (trx) => {
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
                .set({user_level: newUser.level, user_xp: newUser.xp})
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
        });
    }
}
