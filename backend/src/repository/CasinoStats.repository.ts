import {sql, type Kysely} from "kysely";
import type {DB} from "../db/schema.js";

const TZ = sql.lit("Europe/Paris");

// Famille d'une mise de roulette, d'après sa clé (n:17, split:17-20, corner:17, red, dozen:2…)
const BET_KIND = sql<string>`case
    when key like 'n:%' then 'number'
    when key like 'split:%' then 'split'
    when key like 'corner:%' then 'corner'
    when key in ('red', 'black') then 'color'
    when key in ('even', 'odd') then 'parity'
    when key in ('low', 'high') then 'half'
    when key like 'dozen:%' then 'dozen'
    when key like 'column:%' then 'column'
    else 'other' end`;

/*
 * Statistiques des jeux de hasard (onglet « Hasard » de la page Statistiques, administrateur) :
 * mises, crédits misés et rendus, bénéfice de la maison, joueurs, Plinko (cases, mises), roulette
 * (numéros sortis, types de mises, tours), meilleurs et pires joueurs, plus gros gains.
 * casino_plays a une ligne par bille de Plinko et par joueur et tour de roulette.
 */
export class CasinoStatsRepository {
    constructor(private db: Kysely<DB>) {
    }

    async all(days: number) {
        const [overview, games, timeline, hours, plinkoSlots, plinkoBets, rouletteNumbers, rouletteRounds,
            betKinds, favoriteNumbers, players, biggestWins] = await Promise.all([
            this.overview(), this.perGame(), this.timeline(days), this.hours(), this.plinkoSlots(), this.plinkoBets(),
            this.rouletteNumbers(), this.rouletteRounds(), this.betKinds(), this.favoriteNumbers(), this.players(), this.biggestWins(),
        ]);
        return {
            generatedAt: new Date().toISOString(), overview, games, timeline, hours, plinkoSlots, plinkoBets,
            rouletteNumbers, rouletteRounds, betKinds, favoriteNumbers, players, biggestWins,
        };
    }

    private async overview() {
        const {rows} = await sql<{
            plays: number; wagered: number; paid: number; players: number; players7: number; plays1: number;
            wagered1: number; paid1: number; won: number; even: number; first: Date | null;
        }>`select count(*)::int                                                                   as plays,
                  coalesce(sum(bet), 0)::float8                                                   as wagered,
                  coalesce(sum(payout), 0)::float8                                                as paid,
                  count(distinct user_id)::int                                                    as players,
                  count(distinct user_id) filter (where created_at > now() - interval '7 days')::int as players7,
                  count(*) filter (where created_at > now() - interval '1 day')::int              as plays1,
                  coalesce(sum(bet) filter (where created_at > now() - interval '1 day'), 0)::float8 as wagered1,
                  coalesce(sum(payout) filter (where created_at > now() - interval '1 day'), 0)::float8 as paid1,
                  count(*) filter (where payout > bet)::int                                        as won,
                  count(*) filter (where payout = bet)::int                                        as even,
                  min(created_at)                                                                 as first
           from casino_plays`.execute(this.db);
        const o = rows[0]!;
        return {...o, first: o.first?.toISOString() ?? null};
    }

    private async perGame() {
        const {rows} = await sql<{
            game: string; plays: number; players: number; wagered: number; paid: number; avgBet: number; bestNet: number; won: number; plays7: number;
        }>`select game,
                  count(*)::int                                                      as plays,
                  count(distinct user_id)::int                                       as players,
                  sum(bet)::float8                                                   as wagered,
                  sum(payout)::float8                                                as paid,
                  avg(bet)::float8                                                   as "avgBet",
                  max(payout - bet)::int                                             as "bestNet",
                  count(*) filter (where payout > bet)::int                          as won,
                  count(*) filter (where created_at > now() - interval '7 days')::int as plays7
           from casino_plays
           group by game
           order by count(*) desc`.execute(this.db);
        return rows;
    }

    // Mises, crédits misés et rendus par jour et par jeu (heure française)
    private async timeline(days: number) {
        const {rows} = await sql<{ day: string; game: string | null; plays: number; wagered: number; paid: number; players: number }>`
            with d as (select generate_series((now() at time zone ${TZ})::date - ${days - 1}::int,
                                              (now() at time zone ${TZ})::date, interval '1 day')::date as day)
            select d.day::text                       as day,
                   c.game,
                   count(c.id)::int                  as plays,
                   coalesce(sum(c.bet), 0)::float8    as wagered,
                   coalesce(sum(c.payout), 0)::float8 as paid,
                   count(distinct c.user_id)::int    as players
            from d
                     left join casino_plays c on (c.created_at at time zone ${TZ})::date = d.day
            group by d.day, c.game
            order by d.day`.execute(this.db);
        const byDay = new Map<string, { day: string; plays: number; wagered: number; paid: number; byGame: Record<string, { plays: number; wagered: number; paid: number }> }>();
        for (const r of rows) {
            const day = byDay.get(r.day) ?? {day: r.day, plays: 0, wagered: 0, paid: 0, byGame: {}};
            if (r.game) {
                day.plays += r.plays;
                day.wagered += r.wagered;
                day.paid += r.paid;
                day.byGame[r.game] = {plays: r.plays, wagered: r.wagered, paid: r.paid};
            }
            byDay.set(r.day, day);
        }
        return [...byDay.values()];
    }

    // Mises par heure de la journée (heure française)
    private async hours() {
        const {rows} = await sql<{ hour: number; plays: number; wagered: number }>`
            select extract(hour from created_at at time zone ${TZ})::int as hour, count(*)::int as plays, sum(bet)::float8 as wagered
            from casino_plays
            group by 1`.execute(this.db);
        return Array.from({length: 24}, (_, h) => rows.find(r => r.hour === h) ?? {hour: h, plays: 0, wagered: 0});
    }

    // Plinko : billes tombées dans chaque case
    private async plinkoSlots() {
        const {rows} = await sql<{ slot: number; drops: number; paid: number }>`
            select outcome::int as slot, count(*)::int as drops, sum(payout)::float8 as paid
            from casino_plays
            where game = 'plinko'
            group by outcome
            order by outcome`.execute(this.db);
        return rows;
    }

    // Plinko : mises choisies
    private async plinkoBets() {
        const {rows} = await sql<{ bet: number; drops: number; players: number }>`
            select bet, count(*)::int as drops, count(distinct user_id)::int as players
            from casino_plays
            where game = 'plinko'
            group by bet
            order by bet`.execute(this.db);
        return rows;
    }

    // Roulette : numéros sortis (les tours sans jeton sont oubliés au bout de deux jours)
    private async rouletteNumbers() {
        const {rows} = await sql<{ number: number; draws: number }>`
            select number::int, count(*)::int as draws from roulette_rounds group by number`.execute(this.db);
        return Array.from({length: 37}, (_, n) => rows.find(r => r.number === n)?.draws ?? 0);
    }

    // Roulette : tours joués, joueurs par tour, pots
    private async rouletteRounds() {
        const {rows} = await sql<{
            drawn: number; firstDrawn: Date | null; withBets: number; seats: number; chips: number; wagered: number; biggestPot: number; maxPlayers: number;
        }>`with pots as (select round_id, sum(amount) as pot, count(distinct user_id) as players, count(*) as chips
                         from roulette_bets
                         where not ghost
                         group by round_id)
           select (select count(*) from roulette_rounds)::int          as drawn,
                  (select min(drawn_at) from roulette_rounds)          as "firstDrawn",
                  count(*)::int                                        as "withBets",
                  coalesce(sum(players), 0)::int                       as seats,
                  coalesce(sum(chips), 0)::int                         as chips,
                  coalesce(sum(pot), 0)::float8                        as wagered,
                  coalesce(max(pot), 0)::float8                        as "biggestPot",
                  coalesce(max(players), 0)::int                       as "maxPlayers"
           from pots`.execute(this.db);
        const r = rows[0]!;
        return {...r, firstDrawn: r.firstDrawn?.toISOString() ?? null};
    }

    // Roulette : jetons, crédits misés et rendus par famille de mise (tours déjà payés)
    private async betKinds() {
        const {rows} = await sql<{ kind: string; chips: number; players: number; wagered: number; paid: number }>`
            select ${BET_KIND}                   as kind,
                   count(*)::int                 as chips,
                   count(distinct user_id)::int  as players,
                   sum(amount)::float8           as wagered,
                   sum(payout)::float8           as paid
            from roulette_bets
            where payout is not null and not ghost
            group by 1
            order by sum(amount) desc`.execute(this.db);
        return rows;
    }

    // Roulette : numéros les plus joués en plein
    private async favoriteNumbers() {
        const {rows} = await sql<{ number: number; chips: number; wagered: number; players: number }>`
            select substring(key from 3)::int as number, count(*)::int as chips, sum(amount)::float8 as wagered,
                   count(distinct user_id)::int as players
            from roulette_bets
            where key like 'n:%' and not ghost
            group by 1
            order by sum(amount) desc
            limit 8`.execute(this.db);
        return rows;
    }

    // Joueurs : mises, crédits misés et rendus, bilan (gain net), dernier passage
    private async players() {
        const {rows} = await sql<{
            username: string; plays: number; wagered: number; paid: number; net: number; credits: number; biggest: number; last: Date; games: string[];
        }>`select u.username,
                  count(*)::int                         as plays,
                  sum(c.bet)::float8                    as wagered,
                  sum(c.payout)::float8                 as paid,
                  (sum(c.payout) - sum(c.bet))::float8  as net,
                  u.credits,
                  max(c.payout - c.bet)::int            as biggest,
                  max(c.created_at)                     as last,
                  array_agg(distinct c.game)            as games
           from casino_plays c
                    join users u on u.id = c.user_id
           group by u.id
           order by count(*) desc
           limit 500`.execute(this.db);
        return rows.map(r => ({...r, last: r.last.toISOString()}));
    }

    // Plus gros gains en une mise (gain net)
    private async biggestWins() {
        const {rows} = await sql<{ username: string; game: string; bet: number; payout: number; outcome: number; at: Date }>`
            select u.username, c.game, c.bet, c.payout, c.outcome::int as outcome, c.created_at as at
            from casino_plays c
                     join users u on u.id = c.user_id
            where c.payout > c.bet
            order by c.payout - c.bet desc, c.created_at desc
            limit 10`.execute(this.db);
        return rows.map(r => ({...r, at: r.at.toISOString()}));
    }
}
