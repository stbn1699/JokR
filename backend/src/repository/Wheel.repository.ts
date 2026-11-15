import type {Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import {addXp} from "../utils/leveling.js";
import {WHEEL_ITEM_FALLBACK, WHEEL_SEGMENTS} from "../utils/wheel.js";

// Bille offerte par la case « cadeau » (null : le joueur les avait toutes, il a eu des crédits à la place)
export type WheelItem = { id: string; name: string; file: string };

export type WheelSpinResult =
    | { ok: true; credits: number; level: number; xp: number; item: WheelItem | null; creditsWon: number }
    | { ok: false; reason: "already" | "user" };

/*
 * Roue du jour (voir utils/wheel.ts) : lancers enregistrés dans daily_wheel_spins, un par jour,
 * plus un par case « relance » tombée ce jour-là.
 */
export class WheelRepository {
    constructor(private db: Kysely<DB>) {
    }

    // Lancers du joueur ce jour-là, dans l'ordre
    async spinsOn(userId: string, date: string, db: Kysely<DB> = this.db): Promise<number[]> {
        const rows = await db.selectFrom("daily_wheel_spins").select("segment")
            .where("user_id", "=", userId).where("spin_date", "=", date).orderBy("attempt").execute();
        return rows.map(r => r.segment);
    }

    /**
     * Enregistre un lancer et donne le gain (crédits, XP ou bille), dans une transaction (ligne du joueur
     * verrouillée : deux lancers simultanés passent l'un après l'autre). `pickItem` choisit la bille offerte
     * parmi celles qu'il n'a pas. Plus de lancer disponible aujourd'hui : rien n'est donné.
     */
    async spin(userId: string, date: string, segment: number, pickItem: (owned: Set<string>) => WheelItem | null): Promise<WheelSpinResult> {
        const s = WHEEL_SEGMENTS[segment]!;
        return this.db.transaction().execute(async trx => {
            const user = await trx.selectFrom("users").select(["credits", "user_level", "user_xp"])
                .where("id", "=", userId).forUpdate().executeTakeFirst();
            if (!user) return {ok: false, reason: "user"} as const;

            const done = await this.spinsOn(userId, date, trx);
            if (!wheelAvailable(done)) return {ok: false, reason: "already"} as const;

            let item: WheelItem | null = null;
            let credits = s.reward === "credits" ? s.amount : 0;
            const xp = s.reward === "xp" ? s.amount : 0;
            if (s.reward === "item") {
                const owned = await trx.selectFrom("user_items").select("item_id").where("user_id", "=", userId).execute();
                item = pickItem(new Set(owned.map(o => o.item_id)));
                if (item) await trx.insertInto("user_items").values({user_id: userId, item_id: item.id, price: 0}).execute();
                else credits = WHEEL_ITEM_FALLBACK;
            }

            await trx.insertInto("daily_wheel_spins")
                .values({user_id: userId, spin_date: date, attempt: done.length + 1, segment, credits, xp, item_id: item?.id ?? null})
                .execute();

            const next = addXp(user.user_level, user.user_xp, xp);
            const updated = await trx.updateTable("users")
                .set(eb => ({credits: eb("credits", "+", credits), user_level: next.level, user_xp: next.xp}))
                .where("id", "=", userId).returning("credits").executeTakeFirstOrThrow();
            return {ok: true, credits: updated.credits, level: next.level, xp: next.xp, item, creditsWon: credits} as const;
        });
    }
}

// Encore un lancer aujourd'hui ? Un par jour, plus un par relance tombée (`done` : cases des lancers du jour)
export function wheelAvailable(done: number[]): boolean {
    const respins = done.filter(i => WHEEL_SEGMENTS[i]?.reward === "respin").length;
    return done.length < 1 + respins;
}
