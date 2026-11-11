import {sql, type Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import {gameIs, isFiltered, NO_FILTER, type StatsFilter, timelineDays, within} from "../utils/statsFilter.js";

// Une partie non terminée après ce délai est abandonnée (même durée que la mémoire des parties en cours)
const ABANDONED_AFTER = sql`interval '6 hours'`;
// Jours et heures comptés à l'heure française
const TZ = sql.lit("Europe/Paris");

const num = (v: unknown): number => Number(v ?? 0);
const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

type Row = Record<string, unknown>;

/*
 * Requêtes de la page Statistiques (administrateur uniquement).
 * Tout est calculé en base ; chaque méthode renvoie des nombres prêts à afficher.
 * Les méthodes prennent les filtres de la page (période, jeu, voir statsFilter.ts) : les parties, victoires et défis
 * sont comptés dans la période et pour le jeu choisi ; les comptes joueurs (inscrits, niveaux) restent globaux.
 */
export class StatsRepository {
    constructor(private readonly db: Kysely<DB>) {}

    private async rows<T extends Row = Row>(query: ReturnType<typeof sql>): Promise<T[]> {
        return (await query.execute(this.db)).rows as T[];
    }

    // Requête d'agrégat : toujours une ligne
    private async one(query: ReturnType<typeof sql>): Promise<Row> {
        return (await this.rows(query))[0] ?? {};
    }

    async overview(f: StatsFilter = NO_FILTER) {
        const users = await this.one(sql`
            select count(*)                                                        as total,
                   count(*) filter (where created_at > now() - interval '1 day')   as new1,
                   count(*) filter (where created_at > now() - interval '7 days')  as new7,
                   count(*) filter (where created_at > now() - interval '30 days') as new30,
                   count(*) filter (where last_seen_at > now() - interval '1 day')   as active1,
                   count(*) filter (where last_seen_at > now() - interval '7 days')  as active7,
                   count(*) filter (where last_seen_at > now() - interval '30 days') as active30,
                   coalesce(sum(credits), 0)                                       as credits_held,
                   coalesce(avg(user_level), 0)                                    as avg_level,
                   coalesce(max(user_level), 0)                                    as max_level
            from users`);
        const sessions = await this.one(sql`
            select count(*)                                                                      as started,
                   count(*) filter (where finished_at is not null)                               as finished,
                   count(*) filter (where finished_at is null and started_at < now() - ${ABANDONED_AFTER}) as abandoned,
                   count(*) filter (where finished_at is null and started_at >= now() - ${ABANDONED_AFTER}) as in_progress,
                   count(*) filter (where not logged_in)                                         as guests,
                   count(*) filter (where started_at > now() - interval '1 day')                 as started1,
                   count(*) filter (where started_at > now() - interval '7 days')                as started7,
                   count(*) filter (where started_at > now() - interval '30 days')               as started30,
                   coalesce(sum(failed_attempts), 0)                                             as failed_attempts,
                   count(distinct user_id) filter (where started_at > now() - interval '7 days') as players7,
                   count(distinct user_id) filter (where started_at > now() - interval '30 days') as players30,
                   min(started_at)                                                               as first_started
            from game_sessions
            where ${within("started_at", f)} and ${gameIs("game_code", f)}`);
        const rewards = await this.one(sql`
            select coalesce(sum(xp), 0) as xp, coalesce(sum(credits), 0) as credits, count(*) as wins
            from game_results
            where ${within("finished_at", f)} and ${gameIs("game_code", f)}`);
        const daily = await this.one(sql`
            select (select count(*) from daily_challenges where ${within("created_at", f)} and ${gameIs("game_code", f)}) as challenges,
                   (select count(*) from daily_results where ${within("finished_at", f)} and ${gameIs("game_code", f)}) as completions,
                   (select count(distinct user_id) from daily_results where ${within("finished_at", f)} and ${gameIs("game_code", f)}) as players,
                   (select count(*) from daily_results
                    where challenge_date > (now() at time zone ${TZ})::date - 30
                      and ${within("finished_at", f)} and ${gameIs("game_code", f)}) as completions30`);

        return {
            users: {
                total: num(users.total), new1: num(users.new1), new7: num(users.new7), new30: num(users.new30),
                active1: num(users.active1), active7: num(users.active7), active30: num(users.active30),
                creditsHeld: num(users.credits_held), avgLevel: num(users.avg_level), maxLevel: num(users.max_level),
            },
            sessions: {
                started: num(sessions.started), finished: num(sessions.finished), abandoned: num(sessions.abandoned),
                inProgress: num(sessions.in_progress), guests: num(sessions.guests),
                started1: num(sessions.started1), started7: num(sessions.started7), started30: num(sessions.started30),
                failedAttempts: num(sessions.failed_attempts),
                players7: num(sessions.players7), players30: num(sessions.players30),
                firstStarted: sessions.first_started ?? null,
            },
            rewards: {xp: num(rewards.xp), credits: num(rewards.credits), wins: num(rewards.wins)},
            daily: {
                challenges: num(daily.challenges), completions: num(daily.completions),
                players: num(daily.players), completions30: num(daily.completions30),
            },
        };
    }

    // Par jeu : volume, taux de réussite, temps, appareils, modes
    async perGame(f: StatsFilter = NO_FILTER) {
        const rows = await this.rows(sql`
            select g.code, g.designation,
                   count(s.id)                                                          as started,
                   count(s.id) filter (where s.started_at > now() - interval '30 days') as started30,
                   count(s.id) filter (where s.finished_at is not null)                 as finished,
                   count(s.id) filter (where s.finished_at is null and s.started_at < now() - ${ABANDONED_AFTER}) as abandoned,
                   count(s.id) filter (where not s.logged_in)                           as guests,
                   count(distinct s.user_id)                                            as players,
                   avg(s.duration_ms)                                                   as avg_ms,
                   percentile_cont(0.5) within group (order by s.duration_ms)           as median_ms,
                   min(s.duration_ms)                                                   as best_ms,
                   coalesce(sum(s.failed_attempts), 0)                                  as failed_attempts,
                   count(s.id) filter (where s.mode = 'free')                           as mode_free,
                   count(s.id) filter (where s.mode = 'daily')                          as mode_daily,
                   count(s.id) filter (where s.mode = 'replay')                         as mode_replay,
                   count(s.id) filter (where s.device = 'mobile')                       as device_mobile,
                   count(s.id) filter (where s.device = 'tablet')                       as device_tablet,
                   count(s.id) filter (where s.device = 'desktop')                      as device_desktop,
                   count(s.id) filter (where s.device is null)                          as device_unknown
            from games g
                     left join game_sessions s on s.game_code = g.code and ${within("s.started_at", f)}
            where ${gameIs("g.code", f)}
            group by g.code, g.designation
            order by started30 desc, started desc, g.designation`);
        return rows.map(r => ({
            code: String(r.code), name: String(r.designation),
            started: num(r.started), started30: num(r.started30), finished: num(r.finished), abandoned: num(r.abandoned),
            guests: num(r.guests), players: num(r.players),
            avgMs: numOrNull(r.avg_ms), medianMs: numOrNull(r.median_ms), bestMs: numOrNull(r.best_ms),
            failedAttempts: num(r.failed_attempts),
            modes: {free: num(r.mode_free), daily: num(r.mode_daily), replay: num(r.mode_replay)},
            devices: {mobile: num(r.device_mobile), tablet: num(r.device_tablet), desktop: num(r.device_desktop), unknown: num(r.device_unknown)},
        }));
    }

    // Réglages choisis (taille, cases à remplir) : lesquels sont joués, réussis, et en combien de temps
    async configs(f: StatsFilter = NO_FILTER) {
        const rows = await this.rows(sql`
            select game_code, grid_size, empty_cells,
                   count(*)                                        as started,
                   count(*) filter (where finished_at is not null) as finished,
                   percentile_cont(0.5) within group (order by duration_ms) as median_ms
            from game_sessions
            where ${within("started_at", f)} and ${gameIs("game_code", f)}
            group by game_code, grid_size, empty_cells
            order by game_code, grid_size, empty_cells`);
        return rows.map(r => ({
            gameCode: String(r.game_code), gridSize: num(r.grid_size), emptyCells: num(r.empty_cells),
            started: num(r.started), finished: num(r.finished), medianMs: numOrNull(r.median_ms),
        }));
    }

    // Jour par jour (heure française) : parties par jeu, nouveaux comptes, défis réussis
    async timeline(days: number, f: StatsFilter = NO_FILTER) {
        const {start, end} = timelineDays(f, days);
        const rows = await this.rows(sql`
            with d as (select generate_series(${start}, ${end}, interval '1 day')::date as day)
            select to_char(d.day, 'YYYY-MM-DD') as day,
                   (select count(*) from game_sessions s where (s.started_at at time zone ${TZ})::date = d.day
                      and ${within("s.started_at", f)} and ${gameIs("s.game_code", f)}) as started,
                   (select count(*) from game_sessions s where (s.finished_at at time zone ${TZ})::date = d.day
                      and ${within("s.finished_at", f)} and ${gameIs("s.game_code", f)}) as finished,
                   (select count(distinct coalesce(s.user_id::text, s.id::text)) from game_sessions s
                    where (s.started_at at time zone ${TZ})::date = d.day and s.user_id is not null
                      and ${within("s.started_at", f)} and ${gameIs("s.game_code", f)}) as players,
                   (select count(*) from users u where (u.created_at at time zone ${TZ})::date = d.day
                      and ${within("u.created_at", f)}) as new_users,
                   (select count(*) from daily_results r where r.challenge_date = d.day
                      and ${within("r.finished_at", f)} and ${gameIs("r.game_code", f)}) as daily_completions,
                   (select coalesce(json_object_agg(game_code, n), '{}')
                    from (select game_code, count(*) as n from game_sessions s
                          where (s.started_at at time zone ${TZ})::date = d.day
                            and ${within("s.started_at", f)} and ${gameIs("s.game_code", f)}
                          group by game_code) x) as by_game
            from d
            order by d.day`);
        return rows.map(r => ({
            day: String(r.day), started: num(r.started), finished: num(r.finished), players: num(r.players),
            newUsers: num(r.new_users), dailyCompletions: num(r.daily_completions),
            byGame: Object.fromEntries(Object.entries((r.by_game ?? {}) as Record<string, unknown>).map(([k, v]) => [k, num(v)])),
        }));
    }

    // Heures et jours de la semaine où l'on joue (heure française, 0 = dimanche)
    async rhythm(f: StatsFilter = NO_FILTER) {
        const hours = await this.rows(sql`
            select extract(hour from started_at at time zone ${TZ})::int as h, count(*) as n
            from game_sessions where ${within("started_at", f)} and ${gameIs("game_code", f)} group by 1`);
        const weekdays = await this.rows(sql`
            select extract(dow from started_at at time zone ${TZ})::int as d, count(*) as n
            from game_sessions where ${within("started_at", f)} and ${gameIs("game_code", f)} group by 1`);
        const byHour = Array<number>(24).fill(0);
        for (const r of hours) byHour[num(r.h)] = num(r.n);
        const byWeekday = Array<number>(7).fill(0);
        for (const r of weekdays) byWeekday[num(r.d)] = num(r.n);
        return {byHour, byWeekday};
    }

    // Défi du jour, jeu par jeu, sur les derniers jours
    async dailyByDay(days: number, f: StatsFilter = NO_FILTER) {
        const {start, end} = timelineDays(f, days);
        const rows = await this.rows(sql`
            select to_char(c.challenge_date, 'YYYY-MM-DD') as day, c.game_code,
                   count(r.user_id)                         as completions,
                   percentile_cont(0.5) within group (order by r.duration_ms) as median_ms,
                   (select count(*) from game_sessions s
                    where s.mode = 'daily' and s.game_code = c.game_code
                      and (s.started_at at time zone ${TZ})::date = c.challenge_date) as started
            from daily_challenges c
                     left join daily_results r on r.challenge_date = c.challenge_date and r.game_code = c.game_code
                and ${within("r.finished_at", f)}
            where c.challenge_date between ${start} and ${end} and ${gameIs("c.game_code", f)}
            group by c.challenge_date, c.game_code
            order by c.challenge_date desc, c.game_code`);
        return rows.map(r => ({
            day: String(r.day), gameCode: String(r.game_code), started: num(r.started),
            completions: num(r.completions), medianMs: numOrNull(r.median_ms),
        }));
    }

    // Tous les jeux (code et nom), pour le choix du filtre
    async gameList() {
        const rows = await this.rows(sql`select code, designation from games order by designation`);
        return rows.map(r => ({code: String(r.code), name: String(r.designation)}));
    }

    // Répartition des joueurs par niveau (tranches de 10)
    async levels() {
        const rows = await this.rows(sql`
            select (user_level / 10) * 10 as from_level, count(*) as n
            from users group by 1 order by 1`);
        return rows.map(r => ({from: num(r.from_level), to: num(r.from_level) + 9, players: num(r.n)}));
    }

    // Joueurs les plus actifs
    async topPlayers(limit: number, f: StatsFilter = NO_FILTER) {
        const rows = await this.rows(sql`
            select u.username, u.user_level, u.credits, u.created_at, u.last_seen_at,
                   count(s.id)                                         as started,
                   count(s.id) filter (where s.finished_at is not null) as finished,
                   (select count(*) from daily_results r where r.user_id = u.id
                      and ${within("r.finished_at", f)} and ${gameIs("r.game_code", f)}) as daily_completions,
                   max(s.started_at)                                   as last_game
            from users u
                     left join game_sessions s on s.user_id = u.id
                and ${within("s.started_at", f)} and ${gameIs("s.game_code", f)}
            group by u.id
            ${isFiltered(f) ? sql`having count(s.id) > 0` : sql``}
            order by started desc, u.user_level desc
            limit ${limit}`);
        return rows.map(r => ({
            username: String(r.username), level: num(r.user_level), credits: num(r.credits),
            createdAt: r.created_at ?? null, lastSeenAt: r.last_seen_at ?? null, lastGame: r.last_game ?? null,
            started: num(r.started), finished: num(r.finished), dailyCompletions: num(r.daily_completions),
        }));
    }

    // Données brutes pour une analyse ailleurs (jamais d'email ni de mot de passe)
    async exportAll() {
        const sessions = await this.rows(sql`
            select s.id, s.game_code, s.mode, u.username, s.logged_in, s.grid_size, s.empty_cells, s.device,
                   s.started_at, s.finished_at, s.duration_ms, s.failed_attempts
            from game_sessions s
                     left join users u on u.id = s.user_id
            order by s.started_at`);
        const users = await this.rows(sql`
            select username, user_level, user_xp, credits, created_at, last_seen_at from users order by created_at`);
        const results = await this.rows(sql`
            select r.id, r.game_code, u.username, r.grid_size, r.empty_cells, r.duration_ms, r.xp, r.credits, r.finished_at
            from game_results r
                     join users u on u.id = r.user_id
            order by r.finished_at`);
        const dailyResults = await this.rows(sql`
            select to_char(r.challenge_date, 'YYYY-MM-DD') as challenge_date, r.game_code, u.username, r.duration_ms, r.finished_at
            from daily_results r
                     join users u on u.id = r.user_id
            order by r.challenge_date, r.game_code, r.duration_ms`);
        const dailyChallenges = await this.rows(sql`
            select to_char(challenge_date, 'YYYY-MM-DD') as challenge_date, game_code, grid_size, empty_cells, created_at
            from daily_challenges order by challenge_date, game_code`);
        return {exportedAt: new Date().toISOString(), sessions, users, results, dailyResults, dailyChallenges};
    }
}
