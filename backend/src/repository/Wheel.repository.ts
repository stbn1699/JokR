import type {Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import {addXp} from "../utils/leveling.js";
import {WHEEL_SEGMENTS} from "../utils/wheel.js";

export type WheelSpinResult =
    | { ok: true; credits: number; level: number; xp: number }
    | { ok: false; reason: "already" | "user" };

/*
 * Roue du jour (voir utils/wheel.ts) : un lancer par joueur et par jour, enregistré dans daily_wheel_spins.
 */
export class WheelRepository {
    constructor(private db: Kysely<DB>) {
    }

    // Lancer du joueur ce jour-là (null : pas encore lancé)
    async spinOn(userId: string, date: string): Promise<{ segment: number } | null> {
        const row = await this.db.selectFrom("daily_wheel_spins").select("segment")
            .where("user_id", "=", userId).where("spin_date", "=", date).executeTakeFirst();
        return row ? {segment: row.segment} : null;
    }

    /**
     * Enregistre le lancer du jour et donne le gain (crédits ou XP), dans une transaction.
     * Déjà lancé ce jour-là (clé primaire) : rien n'est donné. Renvoie le solde, le niveau et l'XP après le gain.
     */
    async spin(userId: string, date: string, segment: number): Promise<WheelSpinResult> {
        const s = WHEEL_SEGMENTS[segment]!;
        const credits = s.reward === "credits" ? s.amount : 0;
        const xp = s.reward === "xp" ? s.amount : 0;
        return this.db.transaction().execute(async trx => {
            const user = await trx.selectFrom("users").select(["credits", "user_level", "user_xp"])
                .where("id", "=", userId).forUpdate().executeTakeFirst();
            if (!user) return {ok: false, reason: "user"} as const;

            const inserted = await trx.insertInto("daily_wheel_spins")
                .values({user_id: userId, spin_date: date, segment, credits, xp})
                .onConflict(oc => oc.columns(["user_id", "spin_date"]).doNothing())
                .returning("segment").executeTakeFirst();
            if (!inserted) return {ok: false, reason: "already"} as const;

            const next = addXp(user.user_level, user.user_xp, xp);
            const updated = await trx.updateTable("users")
                .set(eb => ({credits: eb("credits", "+", credits), user_level: next.level, user_xp: next.xp}))
                .where("id", "=", userId).returning("credits").executeTakeFirstOrThrow();
            return {ok: true, credits: updated.credits, level: next.level, xp: next.xp} as const;
        });
    }
}
