import type {Kysely} from "kysely";
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
}
