import {randomInt} from "node:crypto";
import {sql, type Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import {lotteryDrawDate, type LotteryKind, lotteryPeriod, lotteryPrize, lotteryTickets, pickLotteryWinner} from "../utils/lottery.js";

// Notification envoyée au gagnant d'une loterie
export type LotteryWinData = { kind: LotteryKind; date: string; prize: number; tickets: number; totalTickets: number; totalBet: number };

/*
 * Loteries du Hasard (voir utils/lottery.ts) : mises de chacun sur une période, tirages et gagnants.
 * Les mises viennent de casino_plays (billes de Plinko, tours de roulette ; rien en mode admin).
 */
export class LotteryRepository {
    constructor(private db: Kysely<DB>) {
    }

    // Crédits misés par chaque joueur sur une période (start exclu, end compris)
    async betsByUser(start: number, end: number, db: Kysely<DB> = this.db): Promise<{ userId: string; bet: number }[]> {
        const rows = await db.selectFrom("casino_plays")
            .select(["user_id", eb => eb.fn.sum<string>("bet").as("bet")])
            .where("created_at", ">", new Date(start)).where("created_at", "<=", new Date(end))
            .groupBy("user_id").execute();
        return rows.map(r => ({userId: r.user_id, bet: Number(r.bet)}));
    }

    async hasDraws(kind: LotteryKind): Promise<boolean> {
        const row = await this.db.selectFrom("lottery_draws").select("id").where("kind", "=", kind).limit(1).executeTakeFirst();
        return row !== undefined;
    }

    /*
     * Tirage d'une loterie : un ticket au hasard parmi ceux de la période, et le gagnant reçoit la cagnotte
     * (crédits + notification). Tout dans une transaction, et une seule fois par loterie et par jour
     * (redémarrage, plusieurs serveurs : la base refuse le deuxième tirage). Renvoie null s'il était déjà fait.
     */
    async draw(kind: LotteryKind, drawAt: number) {
        const {start, end} = lotteryPeriod(kind, drawAt);
        const date = lotteryDrawDate(drawAt);
        return this.db.transaction().execute(async trx => {
            const bets = await this.betsByUser(start, end, trx);
            const players = bets.map(b => ({...b, tickets: lotteryTickets(b.bet)}));
            const totalBet = players.reduce((sum, p) => sum + p.bet, 0);
            const totalTickets = players.reduce((sum, p) => sum + p.tickets, 0);
            const winner = pickLotteryWinner(players, n => randomInt(n));
            const prize = winner ? lotteryPrize(kind, totalBet) : 0;

            const inserted = await trx.insertInto("lottery_draws").values({
                kind, draw_date: date, period_start: new Date(start), period_end: new Date(end),
                total_bet: totalBet, total_tickets: totalTickets, prize,
                winner_id: winner?.userId ?? null, winner_tickets: winner?.tickets ?? null,
            }).onConflict(oc => oc.columns(["kind", "draw_date"]).doNothing()).returning("id").executeTakeFirst();
            if (!inserted) return null;

            if (winner && prize > 0) {
                await trx.updateTable("users").set(eb => ({credits: eb("credits", "+", prize)})).where("id", "=", winner.userId).execute();
                const data: LotteryWinData = {kind, date, prize, tickets: winner.tickets, totalTickets, totalBet};
                await trx.insertInto("notifications")
                    .values({user_id: winner.userId, kind: "lottery_win", ref: `${kind}:${date}`, data: JSON.stringify(data)})
                    .onConflict(oc => oc.columns(["user_id", "kind", "ref"]).doNothing())
                    .execute();
            }
            return {date, totalBet, totalTickets, prize, winner: winner?.userId ?? null};
        });
    }

    // Derniers gagnants de chaque loterie (le plus récent d'abord)
    async recentWinners(kind: LotteryKind, limit: number) {
        return this.db.selectFrom("lottery_draws as d").innerJoin("users as u", "u.id", "d.winner_id")
            .select([sql<string>`d.draw_date::text`.as("date"), "u.username", "d.prize", "d.winner_tickets", "d.total_tickets"])
            .where("d.kind", "=", kind).orderBy("d.draw_date", "desc").limit(limit).execute();
    }
}
