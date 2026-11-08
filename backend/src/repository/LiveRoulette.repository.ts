import {sql, type Kysely} from "kysely";
import {randomInt} from "node:crypto";
import type {DB} from "../db/schema.js";
import {
    ROULETTE_MAX_PER_BET,
    ROULETTE_MAX_TOTAL,
    type RouletteBet,
    roulettePayout,
    rouletteTotal,
    rouletteTotals,
} from "../utils/roulette.js";

export type PlaceResult = { ok: true; credits: number } | { ok: false; reason: "closed" | "credits" | "limit" | "user" };

const HISTORY_SIZE = 16;

/*
 * Roulette en direct : tirage de chaque tour, jetons des joueurs, paiement.
 * - Miser retire les crédits tout de suite ; c'est refusé dès que le numéro du tour est tiré.
 * - Payer un tour crédite les gains, remplit roulette_bets.payout et garde une ligne par joueur dans casino_plays.
 *   Sans effet sur les jetons déjà payés : on peut le relancer sans risque.
 */
export class LiveRouletteRepository {
    constructor(private db: Kysely<DB>) {
    }

    /*
     * Pose des jetons pour le tour en cours. La ligne du joueur est verrouillée, puis on vérifie que le numéro
     * du tour n'est pas encore tiré (verrou partagé sur le tour : le tirage attend la fin de cette mise).
     */
    // ghost : mode admin (rien n'est retiré, jetons invisibles des autres et payés sans crédits)
    async place(userId: string, round: number, bets: RouletteBet[], ghost = false): Promise<PlaceResult> {
        return this.db.transaction().execute(async trx => {
            const user = await trx.selectFrom("users").select("credits").where("id", "=", userId).forUpdate().executeTakeFirst();
            if (!user) return {ok: false, reason: "user"} as const;
            // tirage et mise ne se croisent jamais : verrou de transaction sur le numéro du tour
            await sql`select pg_advisory_xact_lock_shared(${round}::bigint)`.execute(trx);
            const drawn = await trx.selectFrom("roulette_rounds").select("id").where("id", "=", round).executeTakeFirst();
            if (drawn) return {ok: false, reason: "closed"} as const;

            const total = rouletteTotal(bets);
            if (!ghost && user.credits < total) return {ok: false, reason: "credits"} as const;
            const mine = await trx.selectFrom("roulette_bets").select(["key", "amount"])
                .where("round_id", "=", round).where("user_id", "=", userId).execute();
            if (rouletteTotal(mine) + total > ROULETTE_MAX_TOTAL) return {ok: false, reason: "limit"} as const;
            const already = rouletteTotals(mine);
            for (const [key, amount] of rouletteTotals(bets)) {
                if ((already.get(key) ?? 0) + amount > ROULETTE_MAX_PER_BET) return {ok: false, reason: "limit"} as const;
            }

            const credits = ghost ? user.credits : user.credits - total;
            if (!ghost) await trx.updateTable("users").set({credits}).where("id", "=", userId).execute();
            await trx.insertInto("roulette_bets")
                .values(bets.map(b => ({round_id: round, user_id: userId, key: b.key, amount: b.amount, ghost}))).execute();
            return {ok: true, credits} as const;
        });
    }

    // Retire tous ses jetons du tour en cours (mises encore ouvertes) et rend les crédits ; null si c'est trop tard
    async cancel(userId: string, round: number): Promise<number | null> {
        return this.db.transaction().execute(async trx => {
            const user = await trx.selectFrom("users").select("credits").where("id", "=", userId).forUpdate().executeTakeFirst();
            if (!user) return null;
            await sql`select pg_advisory_xact_lock_shared(${round}::bigint)`.execute(trx);
            const drawn = await trx.selectFrom("roulette_rounds").select("id").where("id", "=", round).executeTakeFirst();
            if (drawn) return null;
            const removed = await trx.deleteFrom("roulette_bets").where("round_id", "=", round).where("user_id", "=", userId)
                .returning(["amount", "ghost"]).execute();
            // jetons du mode admin : rien n'avait été retiré, rien n'est rendu
            const credits = user.credits + rouletteTotal(removed.filter(r => !r.ghost).map(r => ({key: "", amount: r.amount})));
            await trx.updateTable("users").set({credits}).where("id", "=", userId).execute();
            return credits;
        });
    }

    // Ferme les mises du tour : le numéro est tiré pendant que personne ne pose de jeton (verrou exclusif)
    async close(round: number): Promise<number> {
        return this.db.transaction().execute(async trx => {
            await sql`select pg_advisory_xact_lock(${round}::bigint)`.execute(trx);
            await trx.insertInto("roulette_rounds").values({id: round, number: randomInt(0, 37)})
                .onConflict(oc => oc.column("id").doNothing()).execute();
            const row = await trx.selectFrom("roulette_rounds").select("number").where("id", "=", round).executeTakeFirstOrThrow();
            return row.number;
        });
    }

    // Paie les jetons d'un tour déjà tiré ; renvoie le nombre de joueurs payés
    async settle(round: number): Promise<number> {
        return this.db.transaction().execute(async trx => {
            const drawn = await trx.selectFrom("roulette_rounds").select("number").where("id", "=", round).executeTakeFirst();
            if (!drawn) return 0;
            const bets = await trx.selectFrom("roulette_bets").select(["id", "user_id", "key", "amount", "ghost"])
                .where("round_id", "=", round).where("payout", "is", null).forUpdate().execute();
            if (bets.length === 0) return 0;

            const byUser = new Map<string, { bet: number; payout: number }>();
            for (const b of bets) {
                const payout = roulettePayout([{key: b.key, amount: b.amount}], drawn.number);
                await trx.updateTable("roulette_bets").set({payout}).where("id", "=", b.id).execute();
                // mode admin : payé pour l'affichage seulement (ni crédits, ni partie enregistrée)
                if (b.ghost) continue;
                const sum = byUser.get(b.user_id) ?? {bet: 0, payout: 0};
                byUser.set(b.user_id, {bet: sum.bet + b.amount, payout: sum.payout + payout});
            }
            for (const [userId, {bet, payout}] of byUser) {
                if (payout > 0) {
                    await trx.updateTable("users").set(eb => ({credits: eb("credits", "+", payout)})).where("id", "=", userId).execute();
                }
                await trx.insertInto("casino_plays").values({
                    user_id: userId, game: "roulette", bet, payout, seed: round, outcome: drawn.number,
                }).execute();
            }
            return byUser.size;
        });
    }

    // Tours fermés dont des jetons restent à payer (jusqu'au tour `upTo` compris)
    async unpaidRounds(upTo: number): Promise<number[]> {
        const rows = await this.db.selectFrom("roulette_bets").select("round_id").distinct()
            .where("payout", "is", null).where("round_id", "<=", upTo).execute();
        return rows.map(r => Number(r.round_id));
    }

    // Oublie les vieux tours sans jetons (l'historique n'en montre que les derniers)
    async prune(beforeRound: number): Promise<void> {
        await this.db.deleteFrom("roulette_rounds").where("id", "<", beforeRound)
            .where(eb => eb.not(eb.exists(eb.selectFrom("roulette_bets").select("id").whereRef("roulette_bets.round_id", "=", "roulette_rounds.id"))))
            .execute();
    }

    // Jetons d'un tour, avec le pseudo et l'icône de chaque joueur
    async bets(round: number) {
        return this.db.selectFrom("roulette_bets as b").innerJoin("users as u", "u.id", "b.user_id")
            .select(["b.user_id", "u.username", "u.avatar", "u.user_level", "b.key", "b.amount", "b.payout", "b.ghost", "b.created_at"])
            .where("b.round_id", "=", round).orderBy("b.created_at").execute();
    }

    // Derniers numéros tirés, jusqu'au tour `upTo` compris (le plus récent d'abord)
    async history(upTo: number) {
        const rows = await this.db.selectFrom("roulette_rounds").select(["id", "number"])
            .where("id", "<=", upTo).orderBy("id", "desc").limit(HISTORY_SIZE).execute();
        return rows.map(r => ({round: Number(r.id), number: r.number}));
    }

    async credits(userId: string): Promise<number> {
        const row = await this.db.selectFrom("users").select("credits").where("id", "=", userId).executeTakeFirst();
        return row?.credits ?? 0;
    }
}
