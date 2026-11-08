import type {Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import type {ShopItem} from "../utils/shop.js";

export type BuyResult = { ok: true; credits: number } | { ok: false; reason: "owned" | "credits" | "user" };

/*
 * Boutique : objets possédés (user_items), achat avec des crédits, fond du site choisi (users.background).
 */
export class ShopRepository {
    constructor(private db: Kysely<DB>) {
    }

    async state(userId: string) {
        const [user, items] = await Promise.all([
            this.db.selectFrom("users").select(["credits", "background", "plinko_ball", "chip_set"]).where("id", "=", userId).executeTakeFirst(),
            this.db.selectFrom("user_items").select("item_id").where("user_id", "=", userId).execute(),
        ]);
        return {
            credits: user?.credits ?? 0, background: user?.background ?? null, plinkoBall: user?.plinko_ball ?? null,
            chipSet: user?.chip_set ?? null,
            owned: items.map(i => i.item_id),
        };
    }

    /*
     * Achat : crédits retirés et objet ajouté ensemble (ligne du joueur verrouillée : deux achats
     * simultanés ne dépensent jamais plus que ce qu'il a).
     */
    async buy(userId: string, item: ShopItem): Promise<BuyResult> {
        return this.db.transaction().execute(async trx => {
            const user = await trx.selectFrom("users").select("credits").where("id", "=", userId).forUpdate().executeTakeFirst();
            if (!user) return {ok: false, reason: "user"} as const;
            const owned = await trx.selectFrom("user_items").select("item_id")
                .where("user_id", "=", userId).where("item_id", "=", item.id).executeTakeFirst();
            if (owned) return {ok: false, reason: "owned"} as const;
            if (user.credits < item.price) return {ok: false, reason: "credits"} as const;
            await trx.insertInto("user_items").values({user_id: userId, item_id: item.id, price: item.price}).execute();
            const credits = user.credits - item.price;
            await trx.updateTable("users").set({credits}).where("id", "=", userId).execute();
            return {ok: true, credits} as const;
        });
    }

    async owns(userId: string, itemId: string): Promise<boolean> {
        const row = await this.db.selectFrom("user_items").select("item_id")
            .where("user_id", "=", userId).where("item_id", "=", itemId).executeTakeFirst();
        return row !== undefined;
    }

    async level(userId: string): Promise<number> {
        const row = await this.db.selectFrom("users").select("user_level").where("id", "=", userId).executeTakeFirst();
        return row?.user_level ?? 1;
    }

    // Jeu de jetons choisi (null : jetons classiques)
    async setChipSet(userId: string, itemId: string | null): Promise<void> {
        await this.db.updateTable("users").set({chip_set: itemId}).where("id", "=", userId).execute();
    }

    // Bille de Plinko choisie (null : bille par défaut)
    async setPlinkoBall(userId: string, itemId: string | null): Promise<void> {
        await this.db.updateTable("users").set({plinko_ball: itemId}).where("id", "=", userId).execute();
    }

    // Fond choisi (null : fond par défaut)
    async setBackground(userId: string, itemId: string | null): Promise<void> {
        await this.db.updateTable("users").set({background: itemId}).where("id", "=", userId).execute();
    }
}
