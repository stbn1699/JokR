import {sql, type Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import {addXp} from "../utils/leveling.js";
import {dailyRankXp} from "../utils/dailyRankXp.js";

// Contenu d'une notification « résultats des défis du jour »
export type DailyResultsData = {
    date: string;
    // Une ligne par jeu réussi ce jour-là, meilleure place d'abord ; xp : gagnée grâce à cette place
    games: { code: string; name: string; rank: number; total: number; durationMs: number; xp: number }[];
    // XP gagnée au total (déjà ajoutée au joueur), et sa progression juste avant
    xp: number;
    before: { level: number; xp: number };
};

/*
 * Notifications des joueurs (table notifications), affichées dans la cloche du header.
 */
export class NotificationsRepository {
    constructor(private db: Kysely<DB>) {
    }

    /*
     * Clôture des défis d'un jour : chaque joueur qui en a réussi au moins un reçoit une notification
     * avec sa place finale sur chaque jeu (ex aequo : même place, comme le classement du jour),
     * et l'XP de ses places (voir dailyRankXp) est ajoutée à son niveau.
     * Une seule fois par joueur et par jour : la notification et l'XP sont enregistrées ensemble,
     * dans une transaction (redémarrage, plusieurs serveurs : rien n'est donné deux fois).
     * Renvoie le nombre de notifications créées.
     */
    async createDailyResults(date: string): Promise<number> {
        const rows = await this.db
            .selectFrom(eb => eb
                .selectFrom("daily_results")
                .select([
                    "user_id",
                    "game_code",
                    "duration_ms",
                    sql<number>`rank() over (partition by game_code order by duration_ms)`.as("rank"),
                    sql<number>`count(*) over (partition by game_code)`.as("total"),
                ])
                .where("challenge_date", "=", date)
                .as("r"))
            .innerJoin("games as g", "g.code", "r.game_code")
            .select(["r.user_id", "r.game_code", "g.designation", "r.duration_ms", "r.rank", "r.total"])
            .execute();

        // Places de chaque joueur, meilleure place d'abord
        const byUser = new Map<string, DailyResultsData["games"]>();
        for (const row of rows) {
            const rank = Number(row.rank);
            const games = byUser.get(row.user_id) ?? [];
            games.push({
                code: row.game_code, name: row.designation, rank, total: Number(row.total),
                durationMs: row.duration_ms, xp: dailyRankXp(rank),
            });
            byUser.set(row.user_id, games);
        }

        let created = 0;
        for (const [userId, games] of byUser) {
            games.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
            const xp = games.reduce((n, g) => n + g.xp, 0);
            const sent = await this.db.transaction().execute(async trx => {
                const user = await trx
                    .selectFrom("users")
                    .select(["user_level", "user_xp"])
                    .where("id", "=", userId)
                    .forUpdate()
                    .executeTakeFirst();
                if (!user) return false;
                const data: DailyResultsData = {date, games, xp, before: {level: user.user_level, xp: user.user_xp}};
                const inserted = await trx
                    .insertInto("notifications")
                    .values({user_id: userId, kind: "daily_results", ref: date, data: JSON.stringify(data)})
                    .onConflict(oc => oc.columns(["user_id", "kind", "ref"]).doNothing())
                    .returning("id")
                    .executeTakeFirst();
                if (!inserted) return false;
                if (xp > 0) {
                    const next = addXp(user.user_level, user.user_xp, xp);
                    await trx.updateTable("users").set({user_level: next.level, user_xp: next.xp}).where("id", "=", userId).execute();
                }
                return true;
            });
            if (sent) created++;
        }
        return created;
    }

    // Dernières notifications d'un joueur, les plus récentes d'abord
    async list(userId: string, limit: number) {
        return this.db
            .selectFrom("notifications")
            .select(["id", "kind", "data", "created_at as createdAt", "read_at as readAt"])
            .where("user_id", "=", userId)
            .orderBy("created_at", "desc")
            .limit(limit)
            .execute();
    }

    async unreadCount(userId: string): Promise<number> {
        const row = await this.db
            .selectFrom("notifications")
            .select(eb => eb.fn.countAll<string>().as("n"))
            .where("user_id", "=", userId)
            .where("read_at", "is", null)
            .executeTakeFirstOrThrow();
        return Number(row.n);
    }

    // Marquer comme vues : toutes, ou seulement celles de `ids`
    async markRead(userId: string, ids?: string[]): Promise<void> {
        if (ids && ids.length === 0) return;
        let query = this.db
            .updateTable("notifications")
            .set({read_at: sql`now()`})
            .where("user_id", "=", userId)
            .where("read_at", "is", null);
        if (ids) query = query.where("id", "in", ids);
        await query.execute();
    }
}
