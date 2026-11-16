import {randomInt} from "node:crypto";
import type {Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import {dealPoker, drawPoker, POKER_PAYTABLE, type PokerState} from "../utils/poker.js";

export type PokerResult =
    | { ok: true; state: PokerState; credits: number }
    | { ok: false; reason: "user" | "credits" | "active" | "none" };

/*
 * Poker à 5 cartes en solo (voir utils/poker.ts) : la main en cours est gardée en base (poker_hands), le joueur n'en
 * voit que ses cartes. La mise est retirée à la donne ; au tirage, le gain est versé et la partie enregistrée dans
 * casino_plays (jeu « poker » : loterie, statistiques ; outcome : rang de la combinaison, 0 = quinte flush royale,
 * 9 = rien). Mode admin (ghost) : rien n'est retiré, gagné ni enregistré.
 * Tout se fait dans une transaction, ligne du joueur verrouillée.
 */
export class PokerRepository {
    constructor(private db: Kysely<DB>) {
    }

    // Main en cours (null : pas de main en cours)
    async active(userId: string): Promise<PokerState | null> {
        const row = await this.db.selectFrom("poker_hands").select("state")
            .where("user_id", "=", userId).where("finished", "=", false).executeTakeFirst();
        return row?.state ?? null;
    }

    // Dernières mains finies (la plus récente d'abord)
    async recent(userId: string, limit: number): Promise<PokerState[]> {
        const rows = await this.db.selectFrom("poker_hands").select("state")
            .where("user_id", "=", userId).where("finished", "=", true)
            .orderBy("created_at", "desc").limit(limit).execute();
        return rows.map(r => r.state);
    }

    async deal(userId: string, bet: number, ghost: boolean): Promise<PokerResult> {
        return this.db.transaction().execute(async trx => {
            const user = await trx.selectFrom("users").select("credits").where("id", "=", userId).forUpdate().executeTakeFirst();
            if (!user) return {ok: false, reason: "user"} as const;
            const current = await trx.selectFrom("poker_hands").select("id")
                .where("user_id", "=", userId).where("finished", "=", false).executeTakeFirst();
            if (current) return {ok: false, reason: "active"} as const;
            if (!ghost && user.credits < bet) return {ok: false, reason: "credits"} as const;

            const state = dealPoker(bet, n => randomInt(n));
            const credits = ghost ? user.credits : user.credits - bet;
            if (!ghost) await trx.updateTable("users").set({credits}).where("id", "=", userId).execute();
            await trx.insertInto("poker_hands").values({user_id: userId, state: JSON.stringify(state), ghost}).execute();
            return {ok: true, state, credits} as const;
        });
    }

    async draw(userId: string, held: boolean[]): Promise<PokerResult> {
        return this.db.transaction().execute(async trx => {
            const user = await trx.selectFrom("users").select("credits").where("id", "=", userId).forUpdate().executeTakeFirst();
            if (!user) return {ok: false, reason: "user"} as const;
            const hand = await trx.selectFrom("poker_hands").select(["id", "state", "ghost"])
                .where("user_id", "=", userId).where("finished", "=", false).forUpdate().executeTakeFirst();
            if (!hand) return {ok: false, reason: "none"} as const;

            const state = drawPoker(hand.state, held);
            let credits = user.credits;
            if (!hand.ghost) {
                credits += state.payout!;
                await trx.updateTable("users").set({credits}).where("id", "=", userId).execute();
                const rank = POKER_PAYTABLE.findIndex(p => p.hand === state.hand);
                await trx.insertInto("casino_plays").values({
                    user_id: userId, game: "poker", bet: state.bet, payout: state.payout!,
                    seed: randomInt(2 ** 31), outcome: rank < 0 ? POKER_PAYTABLE.length : rank,
                }).execute();
            }
            await trx.updateTable("poker_hands")
                .set({state: JSON.stringify(state), finished: true, updated_at: new Date()})
                .where("id", "=", hand.id).execute();
            return {ok: true, state, credits} as const;
        });
    }
}
