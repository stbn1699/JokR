import {type Kysely, sql} from "kysely";
import type {DB} from "../db/schema.js";
import type {ShopItem} from "../utils/shop.js";
import {MAX_UPGRADES, upgradeLevels, type UpgradeLevels} from "../utils/upgrades.js";

export type BuyResult = { ok: true; credits: number } | { ok: false; reason: "owned" | "credits" | "user" | "requires" };

/*
 * Boutique : objets possédés (user_items), achat avec des crédits, fond du site choisi (users.background).
 */
export class ShopRepository {
    constructor(private db: Kysely<DB>) {
    }

    async state(userId: string) {
        const [user, items] = await Promise.all([
            this.db.selectFrom("users").select(["credits", "background", "plinko_ball", "chip_set", "victory_effect"]).where("id", "=", userId).executeTakeFirst(),
            this.db.selectFrom("user_items").select("item_id").where("user_id", "=", userId).execute(),
        ]);
        return {
            credits: user?.credits ?? 0, background: user?.background ?? null, plinkoBall: user?.plinko_ball ?? null,
            chipSet: user?.chip_set ?? null,
            victoryEffect: user?.victory_effect ?? null,
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
            // amélioration : le niveau d'avant d'abord
            if (item.requires) {
                const before = await trx.selectFrom("user_items").select("item_id")
                    .where("user_id", "=", userId).where("item_id", "=", item.requires).executeTakeFirst();
                if (!before) return {ok: false, reason: "requires"} as const;
            }
            if (user.credits < item.price) return {ok: false, reason: "credits"} as const;
            await trx.insertInto("user_items").values({user_id: userId, item_id: item.id, price: item.price}).execute();
            const credits = user.credits - item.price;
            await trx.updateTable("users").set({credits}).where("id", "=", userId).execute();
            return {ok: true, credits} as const;
        });
    }

    /*
     * Ventes de chaque objet vendu au moins une fois, du plus populaire au moins populaire : achats des 7 derniers
     * jours, puis depuis toujours (pour départager quand la semaine est calme). Les cadeaux (roue du jour, prix 0)
     * ne comptent pas.
     */
    async bestSellers(): Promise<{ itemId: string; week: number; total: number }[]> {
        const {rows} = await sql<{ item_id: string; week: number; total: number }>`
            select item_id,
                   count(*) filter (where purchased_at > now() - interval '7 days')::int as week,
                   count(*)::int                                                     as total
            from user_items
            where price > 0
            group by item_id
            order by week desc, total desc, item_id`.execute(this.db);
        return rows.map(r => ({itemId: r.item_id, week: r.week, total: r.total}));
    }

    /*
     * Niveaux d'amélioration d'un joueur (voir utils/upgrades.ts) ; mode admin (ghost) : tout est débloqué.
     * `db` : pour lire dans une transaction.
     */
    async upgradeLevels(userId: string, ghost = false, db: Kysely<DB> = this.db): Promise<UpgradeLevels> {
        if (ghost) return MAX_UPGRADES;
        const rows = await db.selectFrom("user_items").select("item_id")
            .where("user_id", "=", userId).where("item_id", "like", "upgrade-%").execute();
        return upgradeLevels(rows.map(r => r.item_id));
    }

    // Niveaux d'amélioration de plusieurs joueurs (loteries)
    async upgradeLevelsOf(userIds: string[], db: Kysely<DB> = this.db): Promise<Map<string, UpgradeLevels>> {
        if (userIds.length === 0) return new Map();
        const rows = await db.selectFrom("user_items").select(["user_id", "item_id"])
            .where("user_id", "in", userIds).where("item_id", "like", "upgrade-%").execute();
        const byUser = new Map<string, string[]>();
        for (const r of rows) byUser.set(r.user_id, [...byUser.get(r.user_id) ?? [], r.item_id]);
        return new Map(userIds.map(id => [id, upgradeLevels(byUser.get(id) ?? [])]));
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

    // Effet de victoire choisi (null : les confettis)
    async setVictoryEffect(userId: string, itemId: string | null): Promise<void> {
        await this.db.updateTable("users").set({victory_effect: itemId}).where("id", "=", userId).execute();
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
