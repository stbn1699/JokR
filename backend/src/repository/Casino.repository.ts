import {sql, type Kysely} from "kysely";
import type {DB} from "../db/schema.js";

export type PlayResult =
    | { ok: true; credits: number }
    | { ok: false; reason: "credits" | "user" };

/*
 * Jeux de hasard : une mise débite les crédits, le gain les recrédite, et la partie est gardée
 * (casino_plays), le tout dans une seule transaction.
 */
export class CasinoRepository {
    constructor(private db: Kysely<DB>) {
    }

    /*
     * Ligne du joueur verrouillée : deux mises envoyées en même temps ne dépensent jamais plus
     * que ce qu'il a. `draw` tire le résultat une fois la mise acceptée.
     */
    async play(userId: string, game: string, bet: number, draw: () => { seed: number; outcome: number; payout: number }): Promise<PlayResult & { draw?: ReturnType<typeof draw> }> {
        return this.db.transaction().execute(async trx => {
            const user = await trx.selectFrom("users").select("credits").where("id", "=", userId).forUpdate().executeTakeFirst();
            if (!user) return {ok: false, reason: "user"} as const;
            if (user.credits < bet) return {ok: false, reason: "credits"} as const;
            const result = draw();
            const credits = user.credits - bet + result.payout;
            await trx.updateTable("users").set({credits}).where("id", "=", userId).execute();
            await trx.insertInto("casino_plays").values({
                user_id: userId, game, bet, payout: result.payout, seed: result.seed, outcome: result.outcome,
            }).execute();
            return {ok: true, credits, draw: result} as const;
        });
    }

    /*
     * Billes de Plinko lâchées par les autres joueurs ces dernières secondes (le site les rejoue en fond),
     * avec leur âge en millisecondes mesuré par la base (pas de souci d'horloge entre serveur et navigateur),
     * et le nombre d'autres joueurs passés sur la table dans la dernière minute.
     * `friend` : le joueur de la bille est un ami (amitié acceptée) de celui qui regarde.
     */
    async recentPlinko(userId: string, withinMs: number) {
        const drops = await this.db.selectFrom("casino_plays as c").innerJoin("users as u", "u.id", "c.user_id")
            .select(["c.id", "c.seed", "c.outcome", "c.bet", "c.payout", "u.username", "u.plinko_ball",
                sql<number>`(extract(epoch from (now() - c.created_at)) * 1000)::int`.as("ago"),
                sql<boolean>`exists (select 1 from friendships f where f.status = 'accepted'
                    and ((f.requester_id = ${userId} and f.addressee_id = c.user_id)
                      or (f.addressee_id = ${userId} and f.requester_id = c.user_id)))`.as("friend")])
            .where("c.game", "=", "plinko").where("c.user_id", "!=", userId)
            .where("c.created_at", ">", sql<Date>`now() - make_interval(secs => ${withinMs / 1000})`)
            .orderBy("c.created_at", "desc").limit(60).execute();
        const players = await this.db.selectFrom("casino_plays").select(eb => eb.fn.count<string>("user_id").distinct().as("n"))
            .where("game", "=", "plinko").where("user_id", "!=", userId)
            .where("created_at", ">", sql<Date>`now() - interval '1 minute'`).executeTakeFirst();
        return {
            drops: drops.map(d => ({
                id: d.id, seed: Number(d.seed), slot: d.outcome, bet: d.bet, payout: d.payout, username: d.username, ago: d.ago,
                ball: d.plinko_ball, friend: d.friend,
            })),
            players: Number(players?.n ?? 0),
        };
    }
}
