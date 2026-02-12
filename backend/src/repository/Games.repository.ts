import type {Kysely} from "kysely";
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

    // Récupère la liste complète des jeux triés par designation
    async list(): Promise<Game[]> {
        return this.db
            .selectFrom("games")
            .selectAll()
            .orderBy("designation", "asc")
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
