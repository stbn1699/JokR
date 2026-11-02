import {sql, type Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import type {Game} from "../models/Game.model.js";

/*
 * Repository d'accès aux jeux
 * - Fournit des méthodes pour lire les jeux depuis la table `games`.
 * - Retourne des objets typés `Game` définis dans `models/Game.model.ts`.
 * - Ne gère pas les transactions ni les erreurs : celles-ci sont propagées au caller.
 */
export class GamesRepository {
    constructor(private readonly db: Kysely<DB>) {}

    // Liste des jeux, les plus populaires d'abord : parties lancées sur les 30 derniers jours,
    // puis depuis toujours ; sans données, le Sudoku passe devant, puis l'ordre alphabétique
    async list(): Promise<Game[]> {
        return this.db
            .selectFrom("games")
            .leftJoin("game_sessions", "game_sessions.game_code", "games.code")
            .select(["games.code", "games.designation", "games.base_xp"])
            .groupBy(["games.code", "games.designation", "games.base_xp"])
            .orderBy(sql`count(game_sessions.id) filter (where game_sessions.started_at > now() - interval '30 days')`, "desc")
            .orderBy(sql`count(game_sessions.id)`, "desc")
            .orderBy(sql`games.code = 'SUDOKU'`, "desc")
            .orderBy("games.designation", "asc")
            .execute();
    }

    // Récupère la valeur base_xp pour un jeu identifié par son code
    // Retourne undefined si aucun jeu correspondant n'est trouvé
    async getBaseXp(gameCode: string): Promise<number | undefined> {
        const row = await this.db
            .selectFrom("games")
            .select("base_xp")
            .where("code", "=", gameCode)
            .executeTakeFirst();

        return row?.base_xp;
    }
}
