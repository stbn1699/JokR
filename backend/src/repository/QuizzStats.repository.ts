import {sql, type Kysely} from "kysely";
import type {DB} from "../db/schema.js";
import {NO_FILTER, type StatsFilter, timelineDays, within} from "../utils/statsFilter.js";

const TZ = sql.lit("Europe/Paris");

/*
 * Statistiques du Quizz (console d'administration) : parties par mode, réponses par thème, catégorie et question
 * (taux de bonnes réponses, temps), joueurs, et la banque des questions proposées par les joueurs (tous statuts).
 * Lit quizz_games (une ligne par partie) et quizz_answers (une ligne par réponse) ; la banque (quizz_questions : site
 * et joueurs) est reliée à ses chiffres par la clé q:<id>.
 * Filtre de la page : la période (le jeu ne s'applique pas ici).
 */
export class QuizzStatsRepository {
    constructor(private db: Kysely<DB>) {
    }

    private games(f: StatsFilter) {
        return sql`(select * from quizz_games where ${within("created_at", f)})`;
    }

    private answers(f: StatsFilter) {
        return sql`(select * from quizz_answers where ${within("created_at", f)})`;
    }

    async all(days: number, f: StatsFilter = NO_FILTER) {
        const [overview, modes, timeline, picks, topics, categories, questions, players, bank] = await Promise.all([
            this.overview(f), this.modes(f), this.timeline(days, f), this.picks(f), this.topics(f), this.categories(f),
            this.questions(f), this.players(f), this.bank(),
        ]);
        return {generatedAt: new Date().toISOString(), overview, modes, timeline, picks, topics, categories, questions, players, bank};
    }

    private async overview(f: StatsFilter) {
        const {rows} = await sql<{
            games: number; finished: number; players: number; games1: number; players7: number; first: Date | null;
            answers: number; correct: number; timeouts: number; avgMs: number | null;
        }>`with g as (select count(*)::int                                                                    as games,
                             count(*) filter (where finished_at is not null)::int                             as finished,
                             count(distinct user_id)::int                                                     as players,
                             count(*) filter (where created_at > now() - interval '1 day')::int                as games1,
                             count(distinct user_id) filter (where created_at > now() - interval '7 days')::int as players7,
                             min(created_at)                                                                  as first
                      from ${this.games(f)} as quizz_games),
                a as (select count(*)::int                                 as answers,
                             count(*) filter (where correct)::int          as correct,
                             count(*) filter (where picked is null)::int   as timeouts,
                             avg(ms)::float8                               as "avgMs"
                      from ${this.answers(f)} as quizz_answers)
           select * from g, a`.execute(this.db);
        const o = rows[0]!;
        return {...o, first: o.first?.toISOString() ?? null};
    }

    // Parties par mode : solo, duel au hasard, duel entre amis, duel en direct
    private async modes(f: StatsFilter) {
        const {rows} = await sql<{ mode: string; games: number; finished: number; players: number; avgScore: number | null }>`
            select mode,
                   count(*)::int                                          as games,
                   count(*) filter (where finished_at is not null)::int   as finished,
                   count(distinct user_id)::int                           as players,
                   avg(score) filter (where finished_at is not null)::float8 as "avgScore"
            from ${this.games(f)} as quizz_games
            group by mode
            order by count(*) desc`.execute(this.db);
        return rows;
    }

    // Parties par jour et par mode (heure française)
    private async timeline(days: number, f: StatsFilter) {
        const {start, end} = timelineDays(f, days);
        const {rows} = await sql<{ day: string; mode: string | null; games: number; players: number }>`
            with d as (select generate_series(${start}, ${end}, interval '1 day')::date as day)
            select d.day::text as day, g.mode, count(g.id)::int as games, count(distinct g.user_id)::int as players
            from d
                     left join ${this.games(f)} g on (g.created_at at time zone ${TZ})::date = d.day
            group by d.day, g.mode
            order by d.day`.execute(this.db);
        const byDay = new Map<string, { day: string; games: number; byMode: Record<string, number> }>();
        for (const r of rows) {
            const day = byDay.get(r.day) ?? {day: r.day, games: 0, byMode: {}};
            if (r.mode) {
                day.games += r.games;
                day.byMode[r.mode] = r.games;
            }
            byDay.set(r.day, day);
        }
        return [...byDay.values()];
    }

    // Ce que les joueurs choisissent de jouer : un thème ou un mélange (tout, categorie-…, mix-…)
    private async picks(f: StatsFilter) {
        const {rows} = await sql<{ topicId: string; games: number; players: number; avgScore: number | null }>`
            select topic_id                                               as "topicId",
                   count(*)::int                                          as games,
                   count(distinct user_id)::int                           as players,
                   avg(score) filter (where finished_at is not null)::float8 as "avgScore"
            from ${this.games(f)} as quizz_games
            group by topic_id
            order by count(*) desc`.execute(this.db);
        return rows;
    }

    // Réponses par thème d'origine de la question (mélanges compris)
    private async topics(f: StatsFilter) {
        const {rows} = await sql<{ topicId: string; answers: number; correct: number; players: number; avgMs: number }>`
            select topic_id as "topicId", count(*)::int as answers, count(*) filter (where correct)::int as correct,
                   count(distinct user_id)::int as players, avg(ms)::float8 as "avgMs"
            from ${this.answers(f)} as quizz_answers
            group by topic_id`.execute(this.db);
        return rows;
    }

    private async categories(f: StatsFilter) {
        const {rows} = await sql<{ category: string; answers: number; correct: number; players: number; avgMs: number }>`
            select category, count(*)::int as answers, count(*) filter (where correct)::int as correct,
                   count(distinct user_id)::int as players, avg(ms)::float8 as "avgMs"
            from ${this.answers(f)} as quizz_answers
            group by category`.execute(this.db);
        return rows;
    }

    // Chaque question jouée, par sa clé fixe : réponses, bonnes réponses, temps écoulé, temps moyen
    private async questions(f: StatsFilter) {
        const {rows} = await sql<{ key: string; topicId: string; question: string; answers: number; correct: number; timeouts: number; avgMs: number; last: Date }>`
            select question_key                                 as key,
                   max(topic_id)                                as "topicId",
                   max(question)                                as question,
                   count(*)::int                                as answers,
                   count(*) filter (where correct)::int         as correct,
                   count(*) filter (where picked is null)::int  as timeouts,
                   avg(ms)::float8                              as "avgMs",
                   max(created_at)                              as last
            from ${this.answers(f)} as quizz_answers
            group by question_key`.execute(this.db);
        return rows.map(r => ({...r, last: r.last.toISOString()}));
    }

    // Joueurs les plus actifs
    private async players(f: StatsFilter) {
        const {rows} = await sql<{ username: string; games: number; answers: number; correct: number; bestScore: number; last: Date }>`
            with g as (select user_id, count(*)::int as games, max(score)::int as "bestScore", max(created_at) as last
                       from ${this.games(f)} as quizz_games
                       group by user_id),
                 a as (select user_id, count(*)::int as answers, count(*) filter (where correct)::int as correct
                       from ${this.answers(f)} as quizz_answers
                       group by user_id)
            select u.username, g.games, coalesce(a.answers, 0)::int as answers, coalesce(a.correct, 0)::int as correct,
                   g."bestScore", g.last
            from g
                     join users u on u.id = g.user_id
                     left join a on a.user_id = g.user_id
            order by g.games desc
            limit 30`.execute(this.db);
        return rows.map(r => ({...r, last: r.last.toISOString()}));
    }

    // Toutes les questions, tous statuts : celles du site (number : leur numéro dans le thème) et celles des joueurs
    // (proposées une à une ou venues d'un thème validé)
    private async bank() {
        const {rows} = await sql<{
            id: string; topicId: string; number: number | null; question: string; answers: string[]; status: string;
            author: string | null; createdAt: Date; reviewedAt: Date | null;
        }>`select q.id, q.topic_id as "topicId", q.number, q.question, q.answers, q.status, u.username as author,
                  q.created_at as "createdAt", q.reviewed_at as "reviewedAt"
           from quizz_questions q
                    left join users u on u.id = q.author_id
           order by q.topic_id, q.number nulls last, q.created_at`.execute(this.db);
        return rows.map(r => ({...r, createdAt: r.createdAt.toISOString(), reviewedAt: r.reviewedAt?.toISOString() ?? null}));
    }
}
