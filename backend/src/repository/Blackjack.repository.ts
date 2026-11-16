import {randomInt} from "node:crypto";
import type {Kysely, Transaction} from "kysely";
import type {DB} from "../db/schema.js";
import {
    actionCost,
    type BlackjackAction,
    type BlackjackState,
    dealBlackjack,
    newShoe,
    playBlackjack,
    totalBet,
    totalPayout,
} from "../utils/blackjack.js";

export type BlackjackResult =
    | { ok: true; state: BlackjackState; credits: number }
    | { ok: false; reason: "user" | "credits" | "active" | "none" | "invalid" };

/*
 * Blackjack en solo (voir utils/blackjack.ts) : la main en cours est gardée en base (blackjack_hands), le joueur
 * n'en voit que ses cartes et celle visible du croupier. Les mises sont retirées à chaque fois (départ, doubler,
 * séparer) ; à la fin, le gain est versé et la partie enregistrée dans casino_plays (jeu « blackjack » : loterie,
 * statistiques). Mode admin (ghost) : rien n'est retiré, gagné ni enregistré.
 * Tout se fait dans une transaction, ligne du joueur verrouillée (deux clics en même temps passent l'un après l'autre).
 */
export class BlackjackRepository {
    constructor(private db: Kysely<DB>) {
    }

    // Main en cours (null : pas de main en cours)
    async active(userId: string): Promise<BlackjackState | null> {
        const row = await this.db.selectFrom("blackjack_hands").select("state")
            .where("user_id", "=", userId).where("finished", "=", false).executeTakeFirst();
        return row?.state ?? null;
    }

    // Dernières mains finies (le plus récent d'abord)
    async recent(userId: string, limit: number): Promise<BlackjackState[]> {
        const rows = await this.db.selectFrom("blackjack_hands").select("state")
            .where("user_id", "=", userId).where("finished", "=", true)
            .orderBy("created_at", "desc").limit(limit).execute();
        return rows.map(r => r.state);
    }

    async start(userId: string, bet: number, ghost: boolean): Promise<BlackjackResult> {
        return this.db.transaction().execute(async trx => {
            const user = await trx.selectFrom("users").select("credits").where("id", "=", userId).forUpdate().executeTakeFirst();
            if (!user) return {ok: false, reason: "user"} as const;
            const current = await trx.selectFrom("blackjack_hands").select("id")
                .where("user_id", "=", userId).where("finished", "=", false).executeTakeFirst();
            if (current) return {ok: false, reason: "active"} as const;
            if (!ghost && user.credits < bet) return {ok: false, reason: "credits"} as const;

            const state = dealBlackjack(bet, newShoe(n => randomInt(n)));
            const credits = ghost ? user.credits : user.credits - bet;
            const {id} = await trx.insertInto("blackjack_hands")
                .values({user_id: userId, state: JSON.stringify(state), ghost, finished: false})
                .returning("id").executeTakeFirstOrThrow();
            return {ok: true, state, credits: await this.save(trx, userId, id, state, credits, ghost)} as const;
        });
    }

    async act(userId: string, action: BlackjackAction): Promise<BlackjackResult> {
        return this.db.transaction().execute(async trx => {
            const user = await trx.selectFrom("users").select("credits").where("id", "=", userId).forUpdate().executeTakeFirst();
            if (!user) return {ok: false, reason: "user"} as const;
            const hand = await trx.selectFrom("blackjack_hands").select(["id", "state", "ghost"])
                .where("user_id", "=", userId).where("finished", "=", false).forUpdate().executeTakeFirst();
            if (!hand) return {ok: false, reason: "none"} as const;

            const cost = actionCost(hand.state, action);
            if (!hand.ghost && user.credits < cost) return {ok: false, reason: "credits"} as const;
            const state = playBlackjack(hand.state, action);
            if (!state) return {ok: false, reason: "invalid"} as const;
            const credits = hand.ghost ? user.credits : user.credits - cost;
            return {ok: true, state, credits: await this.save(trx, userId, hand.id, state, credits, hand.ghost)} as const;
        });
    }

    // Enregistre la main ; finie : gain versé et partie enregistrée. Renvoie le solde du joueur.
    private async save(trx: Transaction<DB>, userId: string, id: string, state: BlackjackState, credits: number, ghost: boolean): Promise<number> {
        let balance = credits;
        if (state.finished && !ghost) {
            balance += totalPayout(state);
            await trx.insertInto("casino_plays").values({
                user_id: userId, game: "blackjack", bet: totalBet(state), payout: totalPayout(state),
                seed: randomInt(2 ** 31), outcome: state.hands.length,
            }).execute();
        }
        if (!ghost) await trx.updateTable("users").set({credits: balance}).where("id", "=", userId).execute();
        await trx.updateTable("blackjack_hands")
            .set({state: JSON.stringify(state), finished: state.finished, updated_at: new Date()})
            .where("id", "=", id).execute();
        return balance;
    }
}
