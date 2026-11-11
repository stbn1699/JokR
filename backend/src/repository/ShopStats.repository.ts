import {sql, type Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import {NO_FILTER, type StatsFilter, timelineDays, within} from "../utils/statsFilter.js";

const TZ = sql.lit("Europe/Paris");

/*
 * Statistiques de la boutique (onglet « Boutique » de la page Statistiques, administrateur) :
 * achats (user_items) et fonds portés par les joueurs (users.background : dégradé acheté, couleur de niveau
 * ou null pour le fond par défaut).
 * Les achats sont ceux de la période choisie (voir statsFilter.ts) ; les fonds portés sont ceux d'aujourd'hui.
 */
export class ShopStatsRepository {
    constructor(private db: Kysely<DB>) {
    }

    // Achats de la période choisie (voir statsFilter.ts), lus à la place de la table
    private purchases(f: StatsFilter) {
        return sql`(select * from user_items where ${within("purchased_at", f)})`;
    }

    async all(days: number, f: StatsFilter = NO_FILTER) {
        const [overview, items, worn, timeline, buyers, recent] = await Promise.all([
            this.overview(f), this.items(f), this.worn(), this.timeline(days, f), this.buyers(f), this.recent(f),
        ]);
        return {generatedAt: new Date().toISOString(), overview, items, worn, timeline, buyers, recent};
    }

    private async overview(f: StatsFilter) {
        const {rows} = await sql<{
            purchases: number; spent: number; buyers: number; purchases1: number; purchases7: number; spent7: number;
            buyers7: number; first: Date | null; users: number; creditsHeld: number; wearing: number; wearingBought: number; wearingTier: number;
        }>`select (select count(*) from ${this.purchases(f)} as user_items)::int                                                           as purchases,
                  (select coalesce(sum(price), 0) from ${this.purchases(f)} as user_items)::float8                                         as spent,
                  (select count(distinct user_id) from ${this.purchases(f)} as user_items)::int                                            as buyers,
                  (select count(*) from ${this.purchases(f)} as user_items where purchased_at > now() - interval '1 day')::int             as purchases1,
                  (select count(*) from ${this.purchases(f)} as user_items where purchased_at > now() - interval '7 days')::int            as purchases7,
                  (select coalesce(sum(price), 0) from ${this.purchases(f)} as user_items where purchased_at > now() - interval '7 days')::float8 as spent7,
                  (select count(distinct user_id) from ${this.purchases(f)} as user_items where purchased_at > now() - interval '7 days')::int as buyers7,
                  (select min(purchased_at) from ${this.purchases(f)} as user_items)                                                       as first,
                  (select count(*) from users)::int                                                                as users,
                  (select coalesce(sum(credits), 0) from users)::float8                                            as "creditsHeld",
                  (select count(*) from users where background is not null)::int                                   as wearing,
                  (select count(*) from users where background like 'gradient-%')::int                             as "wearingBought",
                  (select count(*) from users where background like 'tier-%')::int                                 as "wearingTier"`.execute(this.db);
        const o = rows[0]!;
        return {...o, first: o.first?.toISOString() ?? null};
    }

    // Chaque objet acheté : ventes, crédits, acheteurs, dernière vente, et combien le portent
    private async items(f: StatsFilter) {
        const {rows} = await sql<{ itemId: string; sales: number; spent: number; sales7: number; last: Date; wearing: number }>`
            select i.item_id                                                                 as "itemId",
                   count(*)::int                                                             as sales,
                   sum(i.price)::float8                                                      as spent,
                   count(*) filter (where i.purchased_at > now() - interval '7 days')::int  as sales7,
                   max(i.purchased_at)                                                       as last,
                   (select count(*) from users u where u.background = i.item_id)::int       as wearing
            from ${this.purchases(f)} i
            group by i.item_id
            order by count(*) desc, max(i.purchased_at) desc`.execute(this.db);
        return rows.map(r => ({...r, last: r.last.toISOString()}));
    }

    // Fonds portés en ce moment (null : fond par défaut)
    private async worn() {
        const {rows} = await sql<{ background: string | null; players: number }>`
            select background, count(*)::int as players from users group by background order by count(*) desc`.execute(this.db);
        return rows;
    }

    // Achats et crédits dépensés par jour (heure française)
    private async timeline(days: number, f: StatsFilter) {
        const {start, end} = timelineDays(f, days);
        const {rows} = await sql<{ day: string; purchases: number; spent: number; buyers: number }>`
            with d as (select generate_series(${start}, ${end}, interval '1 day')::date as day)
            select d.day::text                     as day,
                   count(i.item_id)::int           as purchases,
                   coalesce(sum(i.price), 0)::float8 as spent,
                   count(distinct i.user_id)::int  as buyers
            from d
                     left join ${this.purchases(f)} i on (i.purchased_at at time zone ${TZ})::date = d.day
            group by d.day
            order by d.day`.execute(this.db);
        return rows;
    }

    // Plus gros acheteurs
    private async buyers(f: StatsFilter) {
        const {rows} = await sql<{ username: string; purchases: number; spent: number; credits: number; background: string | null; last: Date }>`
            select u.username, count(*)::int as purchases, sum(i.price)::float8 as spent, u.credits, u.background,
                   max(i.purchased_at) as last
            from ${this.purchases(f)} i
                     join users u on u.id = i.user_id
            group by u.id
            order by sum(i.price) desc, count(*) desc
            limit 20`.execute(this.db);
        return rows.map(r => ({...r, last: r.last.toISOString()}));
    }

    // Derniers achats
    private async recent(f: StatsFilter) {
        const {rows} = await sql<{ username: string; itemId: string; price: number; at: Date }>`
            select u.username, i.item_id as "itemId", i.price, i.purchased_at as at
            from ${this.purchases(f)} i
                     join users u on u.id = i.user_id
            order by i.purchased_at desc
            limit 15`.execute(this.db);
        return rows.map(r => ({...r, at: r.at.toISOString()}));
    }
}
