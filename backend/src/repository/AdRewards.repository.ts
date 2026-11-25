import type {Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import {AD_REWARD_CREDITS, AD_REWARDS_PER_DAY, checkAdTicket} from "../utils/adRewards.js";

export type AdClaimResult =
    | { ok: true; credits: number; creditsWon: number }
    | { ok: false; reason: "ticket" | "too-soon" | "expired" | "limit" | "user" };

/*
 * Pubs récompensées (voir utils/adRewards.ts), enregistrées dans ad_rewards : une ligne par pub lancée,
 * payée une seule fois quand le site revient après la pub.
 */
export class AdRewardsRepository {
    constructor(private db: Kysely<DB>) {
    }

    // Pubs regardées (payées) par le joueur ce jour-là
    async claimedOn(userId: string, date: string, db: Kysely<DB> = this.db): Promise<number> {
        const row = await db.selectFrom("ad_rewards").select(eb => eb.fn.countAll<string>().as("n"))
            .where("user_id", "=", userId).where("reward_date", "=", date).where("claimed_at", "is not", null)
            .executeTakeFirst();
        return Number(row?.n ?? 0);
    }

    // Ouvre un ticket juste avant une pub (les tickets pas payés de ce joueur sont oubliés) → son id
    async start(userId: string, date: string): Promise<string> {
        return this.db.transaction().execute(async trx => {
            await trx.deleteFrom("ad_rewards").where("user_id", "=", userId).where("claimed_at", "is", null).execute();
            const row = await trx.insertInto("ad_rewards").values({user_id: userId, reward_date: date})
                .returning("id").executeTakeFirstOrThrow();
            return row.id;
        });
    }

    /**
     * Paie le ticket `ticketId` (pub regardée jusqu'au bout), dans une transaction (ligne du joueur verrouillée :
     * deux demandes simultanées passent l'une après l'autre). Le ticket compte pour le jour où il est payé.
     */
    async claim(userId: string, ticketId: string, date: string, now: Date = new Date()): Promise<AdClaimResult> {
        return this.db.transaction().execute(async trx => {
            const user = await trx.selectFrom("users").select("credits").where("id", "=", userId).forUpdate().executeTakeFirst();
            if (!user) return {ok: false, reason: "user"} as const;

            const ticket = await trx.selectFrom("ad_rewards").select("started_at")
                .where("id", "=", ticketId).where("user_id", "=", userId).where("claimed_at", "is", null)
                .executeTakeFirst();
            if (!ticket) return {ok: false, reason: "ticket"} as const;
            const check = checkAdTicket(ticket.started_at, now);
            if (check !== "ok") return {ok: false, reason: check} as const;
            if (await this.claimedOn(userId, date, trx) >= AD_REWARDS_PER_DAY) return {ok: false, reason: "limit"} as const;

            await trx.updateTable("ad_rewards")
                .set({claimed_at: now, reward_date: date, credits: AD_REWARD_CREDITS})
                .where("id", "=", ticketId).execute();
            const updated = await trx.updateTable("users")
                .set(eb => ({credits: eb("credits", "+", AD_REWARD_CREDITS)}))
                .where("id", "=", userId).returning("credits").executeTakeFirstOrThrow();
            return {ok: true, credits: updated.credits, creditsWon: AD_REWARD_CREDITS} as const;
        });
    }
}
