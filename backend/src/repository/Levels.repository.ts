import {sql, type Kysely} from "kysely";
import type {DB} from "../db/schema.js";

/*
 * Progression du mode Niveaux (voir utils/levels.ts) : un enregistrement par niveau réussi, avec le meilleur temps.
 */
export class LevelsRepository {
    constructor(private db: Kysely<DB>) {
    }

    // Niveaux réussis par le joueur dans ce jeu, avec son meilleur temps
    async progress(userId: string, gameCode: string): Promise<{ level: number; bestMs: number }[]> {
        const rows = await this.db.selectFrom("puzzle_level_progress").select(["level", "best_ms"])
            .where("user_id", "=", userId).where("game_code", "=", gameCode).orderBy("level").execute();
        return rows.map(r => ({level: r.level, bestMs: r.best_ms}));
    }

    /**
     * Niveau réussi : enregistré, ou meilleur temps mis à jour. `first` : c'est la première réussite de ce niveau
     * (seule celle-ci rapporte de l'XP et des crédits).
     */
    async complete(userId: string, gameCode: string, level: number, durationMs: number): Promise<{ first: boolean }> {
        const row = await this.db.insertInto("puzzle_level_progress")
            .values({user_id: userId, game_code: gameCode, level, best_ms: durationMs})
            .onConflict(oc => oc.columns(["user_id", "game_code", "level"]).doUpdateSet({
                best_ms: sql`least(puzzle_level_progress.best_ms, excluded.best_ms)`,
            }))
            // xmax = 0 : la ligne vient d'être créée (pas mise à jour)
            .returning(sql<boolean>`(xmax = 0)`.as("inserted"))
            .executeTakeFirstOrThrow();
        return {first: row.inserted};
    }
}
