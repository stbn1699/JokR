/**
 * Quizz dans la console d'administration :
 * - Activité : parties par jour et par mode, catégories, thèmes (joués et choisis), joueurs, questions les plus
 *   dures et les plus faciles (filtre de période)
 * - Banque de questions : toutes les questions en base (celles du site et celles des joueurs, tous statuts), avec la bonne réponse, les mauvaises, la source, et leurs chiffres de toujours (jouée,
 *   réussite, temps). Filtres (recherche, catégorie, thème, source, statut) gardés dans l'adresse ; tri par colonne.
 */

import {type CSSProperties, type ReactNode, useMemo, useState} from "react";
import {Link, useSearchParams} from "react-router-dom";
import {FaSearch, FaSort, FaSortDown, FaSortUp} from "react-icons/fa";
import {statsService} from "../../Services/stats.service.ts";
import type {QuizzMode, QuizzStatsData} from "../../Models/quizzStats.model.ts";
import {mixKind, mixName} from "../../../backend/src/utils/quizzMixes.ts";
import {QUIZZ_CATEGORIES, QUIZZ_TOPICS, type QuizzTopic} from "../Quizz/topics/index.ts";
import {useLoadedQuizzTopics} from "../Quizz/useQuizzTopics.ts";
import AdminPage, {StatsBody} from "../Admin/AdminPage.tsx";
import {adminPath} from "../Admin/adminNav.ts";
import {filterKey, useAdminFilter} from "../Admin/useAdminFilter.ts";
import {useStatsData} from "../Admin/useStatsData.ts";
import BarChart from "./BarChart.tsx";
import {Legend, Tile} from "./StatsWidgets.tsx";
import {dateTime, fmt, longDay, pct, shortDay} from "./statsFormat.ts";
import {timelineTitle} from "./statsFilter.ts";

const MODES: Record<QuizzMode, { label: string; color: string }> = {
    solo: {label: "Solo", color: "#3987e5"},
    random: {label: "Duel au hasard", color: "#e46f24"},
    friend: {label: "Duel entre amis", color: "#1baf7a"},
    live: {label: "Duel en direct", color: "#d55181"},
};
const MODE_KEYS = Object.keys(MODES) as QuizzMode[];

const categoryLabel = (id: string) => QUIZZ_CATEGORIES.find(c => c.id === id)?.label ?? id;
const seconds = (ms: number | null) => (ms === null ? "–" : `${(ms / 1000).toFixed(1).replace(".", ",")} s`);

// Nom d'un thème, ou d'un mélange (tout, catégorie, partie custom)
function topicName(id: string, topics: QuizzTopic[]): string {
    const topic = topics.find(t => t.id === id);
    if (topic) return topic.name;
    const mix = mixKind(id);
    return mix ? mixName(mix) : id;
}

// Réussite en couleur : rouge (dure) → vert (facile)
function Rate({correct, total}: { correct: number; total: number }) {
    if (total === 0) return <span className="quizz-rate empty">–</span>;
    const r = correct / total;
    return (
        <span className="quizz-rate" style={{"--rate": r, "--hue": Math.round(r * 120)} as CSSProperties}>
            <i/>{pct(correct, total)}
        </span>
    );
}

function useQuizzStats(period: boolean) {
    const [urlFilter] = useAdminFilter();
    const filter = period ? {...urlFilter, game: null} : {preset: null, from: null, to: null, game: null};
    const stats = useStatsData(`quizz?${filterKey(filter)}`, signal => statsService.quizz(filter, signal));
    return {...stats, filter};
}

// ---------------------------------------------------------------- Activité

export function QuizzActivity() {
    const {data, error, loading, reload, filter} = useQuizzStats(true);
    const topics = useLoadedQuizzTopics() ?? QUIZZ_TOPICS;
    return (
        <AdminPage group="Quizz" title="Activité" filters={null} onRefresh={reload} refreshing={loading}
                   description="Parties par mode, thèmes et catégories joués, joueurs, et les questions les plus dures et les plus faciles."
                   meta={data && <>Mis à jour le {dateTime(data.generatedAt)}{data.overview.first && <> · données depuis le {dateTime(data.overview.first)}</>}</>}>
            <StatsBody data={data} error={error} label="Chargement du Quizz…">
                {d => d.overview.games === 0 ? <p className="stats-status">Aucune partie sur cette période.</p> : <ActivityContent data={d} topics={topics} period={timelineTitle(filter)}/>}
            </StatsBody>
        </AdminPage>
    );
}

function ActivityContent({data, topics, period}: { data: QuizzStatsData; topics: QuizzTopic[]; period: string }) {
    const o = data.overview;
    const byTopic = new Map(data.topics.map(t => [t.topicId, t]));
    const picked = new Map(data.picks.map(p => [p.topicId, p]));
    // thèmes : ceux qui existent (même jamais joués) puis ceux qui ne sont plus listés
    const topicRows = [...topics.map(t => t.id), ...data.topics.map(t => t.topicId).filter(id => !topics.some(t => t.id === id))]
        .map(id => ({id, answers: byTopic.get(id), picks: picked.get(id)}))
        .sort((a, b) => (b.answers?.answers ?? 0) - (a.answers?.answers ?? 0));
    const mixes = data.picks.filter(p => mixKind(p.topicId));
    const played = data.questions.filter(q => q.answers >= 5);
    const hardest = [...played].sort((a, b) => a.correct / a.answers - b.correct / b.answers).slice(0, 10);
    const easiest = [...played].sort((a, b) => b.correct / b.answers - a.correct / a.answers).slice(0, 10);

    return <>
        <section className="stats-tiles">
            <Tile label="Parties" value={fmt(o.games)} detail={`${fmt(o.games1)} sur 24 h · ${pct(o.finished, o.games)} finies`}/>
            <Tile label="Joueurs" value={fmt(o.players)} detail={`${fmt(o.players7)} ces 7 derniers jours`}/>
            <Tile label="Réponses données" value={fmt(o.answers)} detail={`${fmt(o.timeouts)} temps écoulés`}/>
            <Tile label="Bonnes réponses" value={pct(o.correct, o.answers)} detail={`${fmt(o.correct)} au total`}/>
            <Tile label="Temps de réponse" value={seconds(o.avgMs)} detail="en moyenne"/>
            <Tile label="Questions des joueurs" value={fmt(data.bank.filter(q => q.status === "approved").length)}
                  detail={`validées · ${data.bank.filter(q => q.status === "pending").length} en attente`}/>
        </section>

        <section className="stats-two stats-two-wide">
            <div className="stats-section">
                <h2>Modes de jeu</h2>
                <div className="stats-table-wrap">
                    <table className="stats-table">
                        <thead><tr><th>Mode</th><th>Parties</th><th>Finies</th><th>Joueurs</th><th>Score moyen</th></tr></thead>
                        <tbody>
                        {data.modes.map(m => (
                            <tr key={m.mode}>
                                <td><i className="stats-dot" style={{background: MODES[m.mode]?.color}}/>{MODES[m.mode]?.label ?? m.mode}</td>
                                <td>{fmt(m.games)}</td><td>{pct(m.finished, m.games)}</td><td>{fmt(m.players)}</td>
                                <td>{m.avgScore === null ? "–" : fmt(m.avgScore)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="stats-section">
                <h2>Parties, {period}</h2>
                <Legend items={MODE_KEYS.map(k => ({label: MODES[k].label, color: MODES[k].color}))}/>
                <BarChart ariaLabel="Parties du Quizz par jour et par mode" labelEvery={3}
                          bars={data.timeline.map(t => ({
                              label: shortDay(t.day), title: longDay(t.day), value: t.games,
                              segments: MODE_KEYS.map(k => ({key: k, label: MODES[k].label, value: t.byMode[k] ?? 0, color: MODES[k].color})),
                          }))}/>
            </div>
        </section>

        <section className="stats-two stats-two-wide">
            <div className="stats-section">
                <h2>Catégories</h2>
                <div className="stats-table-wrap">
                    <table className="stats-table">
                        <thead><tr><th>Catégorie</th><th>Réponses</th><th>Joueurs</th><th>Réussite</th><th>Temps</th></tr></thead>
                        <tbody>
                        {[...data.categories].sort((a, b) => b.answers - a.answers).map(c => (
                            <tr key={c.category}>
                                <td>{categoryLabel(c.category)}</td><td>{fmt(c.answers)}</td><td>{fmt(c.players)}</td>
                                <td><Rate correct={c.correct} total={c.answers}/></td><td>{seconds(c.avgMs)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
                {mixes.length > 0 && <>
                    <h2 className="stats-subtitle">Mélanges choisis</h2>
                    <div className="stats-table-wrap">
                        <table className="stats-table">
                            <thead><tr><th>Mélange</th><th>Parties</th><th>Joueurs</th></tr></thead>
                            <tbody>
                            {mixes.map(m => <tr key={m.topicId}><td>{topicName(m.topicId, topics)}</td><td>{fmt(m.games)}</td><td>{fmt(m.players)}</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                </>}
            </div>
            <div className="stats-section">
                <h2>Thèmes</h2>
                <p className="stats-note">Réponses aux questions du thème (mélanges compris) ; « Choisi » : parties lancées sur le thème seul.</p>
                <div className="stats-table-wrap stats-table-tall">
                    <table className="stats-table">
                        <thead><tr><th>Thème</th><th className="text">Catégorie</th><th>Choisi</th><th>Réponses</th><th>Joueurs</th><th>Réussite</th><th>Temps</th><th/></tr></thead>
                        <tbody>
                        {topicRows.map(({id, answers, picks}) => {
                            const topic = topics.find(t => t.id === id);
                            return (
                                <tr key={id}>
                                    <td><i className="stats-dot" style={{background: topic?.color ?? "#94a3b8"}}/>{topicName(id, topics)}
                                        {topic?.userMade && <small> · joueur</small>}</td>
                                    <td className="text">{topic ? categoryLabel(topic.category) : "–"}</td>
                                    <td>{fmt(picks?.games ?? 0)}</td><td>{fmt(answers?.answers ?? 0)}</td><td>{fmt(answers?.players ?? 0)}</td>
                                    <td><Rate correct={answers?.correct ?? 0} total={answers?.answers ?? 0}/></td><td>{seconds(answers?.avgMs ?? null)}</td>
                                    <td><Link to={`${adminPath("quizz/banque")}?theme=${encodeURIComponent(id)}`}>Questions</Link></td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        <section className="stats-two">
            <HardQuestions title="Questions les plus dures" rows={hardest} topics={topics}/>
            <HardQuestions title="Questions les plus faciles" rows={easiest} topics={topics}/>
        </section>

        <section className="stats-section">
            <h2>Joueurs les plus actifs</h2>
            <div className="stats-table-wrap">
                <table className="stats-table">
                    <thead><tr><th>Joueur</th><th>Parties</th><th>Réponses</th><th>Réussite</th><th>Meilleur score</th><th>Dernière partie</th></tr></thead>
                    <tbody>
                    {data.players.map(p => (
                        <tr key={p.username}>
                            <td>{p.username}</td><td>{fmt(p.games)}</td><td>{fmt(p.answers)}</td>
                            <td><Rate correct={p.correct} total={p.answers}/></td><td>{fmt(p.bestScore)}</td><td>{dateTime(p.last)}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </section>
    </>;
}

function HardQuestions({title, rows, topics}: { title: string; rows: QuizzStatsData["questions"]; topics: QuizzTopic[] }) {
    return (
        <div className="stats-section">
            <h2>{title}</h2>
            {rows.length === 0 ? <p className="stats-note">Pas encore assez de réponses (5 au moins par question).</p> : (
                <div className="stats-table-wrap">
                    <table className="stats-table">
                        <thead><tr><th className="text">Question</th><th className="text">Thème</th><th>Réponses</th><th>Réussite</th></tr></thead>
                        <tbody>
                        {rows.map(q => (
                            <tr key={q.key}>
                                <td className="text quizz-bank-question">{q.question}</td><td className="text">{topicName(q.topicId, topics)}</td>
                                <td>{fmt(q.answers)}</td><td><Rate correct={q.correct} total={q.answers}/></td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------- Banque de questions

type Status = "approved" | "pending" | "rejected";
const STATUS_LABELS: Record<Status, string> = {approved: "Validée", pending: "En attente", rejected: "Refusée"};

type BankRow = {
    key: string; topicId: string; question: string; answers: [string, string, string, string];
    source: "site" | "player"; author: string | null; status: Status; createdAt: string | null; order: number;
    played: number; correct: number; timeouts: number; avgMs: number | null;
};

type SortKey = "question" | "topic" | "played" | "rate" | "time" | "date";
const PAGE = 200;

export function QuizzBank() {
    const {data, error, loading, reload} = useQuizzStats(false);
    const topics = useLoadedQuizzTopics();
    return (
        <AdminPage group="Quizz" title="Banque de questions" onRefresh={reload} refreshing={loading}
                   description="Toutes les questions, du site et des joueurs, avec leurs réponses et leurs chiffres depuis le début."
                   meta={data && `Mis à jour le ${dateTime(data.generatedAt)}`}>
            <StatsBody data={topics ? data : null} error={error} label="Chargement des questions…">
                {d => <BankContent data={d} topics={topics!}/>}
            </StatsBody>
        </AdminPage>
    );
}

function BankContent({data, topics}: { data: QuizzStatsData; topics: QuizzTopic[] }) {
    const [params, setParams] = useSearchParams();
    const search = params.get("q") ?? "";
    const category = params.get("categorie") ?? "";
    const theme = params.get("theme") ?? "";
    const source = params.get("source") ?? "";
    const status = (params.get("statut") ?? "approved") as Status | "all";
    const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({key: "topic", dir: 1});
    const [shown, setShown] = useState(PAGE);

    const set = (key: string, value: string) => {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value);
        else next.delete(key);
        // un thème d'une autre catégorie ne reste pas choisi
        if (key === "categorie" && value && theme && topics.find(t => t.id === theme)?.category !== value) next.delete("theme");
        setParams(next, {replace: true});
        setShown(PAGE);
    };

    const rows = useMemo<BankRow[]>(() => {
        const stats = new Map(data.questions.map(q => [q.key, q]));
        const withStats = (key: string) => {
            const s = stats.get(key);
            return {played: s?.answers ?? 0, correct: s?.correct ?? 0, timeouts: s?.timeouts ?? 0, avgMs: s?.avgMs ?? null};
        };
        // même clé que les statistiques (fromServer, quizzMatch.ts) ; ordre du thème : celles du site par numéro, puis
        // celles des joueurs (le serveur les envoie dans cet ordre)
        return data.bank.map((q, i) => {
            const key = `q:${q.id}`;
            const site = q.number !== null;
            return {key, topicId: q.topicId, question: q.question, answers: q.answers, source: site ? "site" as const : "player" as const,
                author: q.author, status: q.status, createdAt: site ? null : q.createdAt, order: i, ...withStats(key)};
        });
    }, [data]);

    const topicOf = (id: string) => topics.find(t => t.id === id);
    const needle = search.trim().toLocaleLowerCase("fr");
    const filtered = rows.filter(r => (status === "all" || r.status === status)
        && (!source || r.source === source)
        && (!theme || r.topicId === theme)
        && (!category || topicOf(r.topicId)?.category === category)
        && (!needle || r.question.toLocaleLowerCase("fr").includes(needle) || r.answers.some(a => a.toLocaleLowerCase("fr").includes(needle))));

    const value = (r: BankRow): string | number => {
        switch (sort.key) {
            case "question": return r.question.toLocaleLowerCase("fr");
            case "topic": return r.order;
            case "played": return r.played;
            case "rate": return r.played ? r.correct / r.played : -1;
            case "time": return r.avgMs ?? -1;
            case "date": return r.createdAt ?? "";
        }
    };
    // par thème : thèmes par nom, puis les questions dans l'ordre du thème
    const nameOf = (r: BankRow) => topicOf(r.topicId)?.name ?? r.topicId;
    const sorted = [...filtered].sort((a, b) => {
        if (sort.key === "topic") {
            const byName = nameOf(a).localeCompare(nameOf(b), "fr");
            if (byName !== 0) return byName * sort.dir;
        }
        const va = value(a), vb = value(b);
        return (va < vb ? -1 : va > vb ? 1 : 0) * (sort.key === "topic" ? 1 : sort.dir);
    });
    const toggleSort = (key: SortKey) => setSort(s => ({key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "question" || key === "topic" ? 1 : -1}));
    const themes = topics.filter(t => !category || t.category === category).sort((a, b) => a.name.localeCompare(b.name, "fr"));
    const count = (s: Status | "all") => rows.filter(r => s === "all" || r.status === s).length;


    return <>
        <div className="admin-toolbar quizz-bank-toolbar">
            <label className="admin-search">
                <FaSearch aria-hidden/>
                <input type="search" placeholder="Chercher dans les questions et les réponses" value={search} onChange={e => set("q", e.target.value)}/>
            </label>
            <select value={category} aria-label="Catégorie" onChange={e => set("categorie", e.target.value)}>
                <option value="">Toutes les catégories</option>
                {QUIZZ_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <select value={theme} aria-label="Thème" onChange={e => set("theme", e.target.value)}>
                <option value="">Tous les thèmes</option>
                {themes.map(t => <option key={t.id} value={t.id}>{t.name}{t.userMade ? " (joueur)" : ""}</option>)}
            </select>
            <div className="admin-segmented" role="radiogroup" aria-label="Source">
                {([["", "Toutes"], ["site", "Site"], ["player", "Joueurs"]] as const).map(([v, label]) => (
                    <button key={v} type="button" role="radio" aria-checked={source === v} className={source === v ? "active" : ""}
                            onClick={() => set("source", v)}>{label}</button>
                ))}
            </div>
            <div className="admin-segmented" role="radiogroup" aria-label="Statut">
                {(["approved", "pending", "rejected", "all"] as const).map(s => (
                    <button key={s} type="button" role="radio" aria-checked={status === s} className={status === s ? "active" : ""}
                            onClick={() => set("statut", s === "approved" ? "" : s)}>
                        {s === "all" ? "Tous statuts" : STATUS_LABELS[s]} <em>{count(s)}</em>
                    </button>
                ))}
            </div>
        </div>

        <p className="quizz-bank-count">
            <strong>{fmt(filtered.length)}</strong> question{filtered.length > 1 ? "s" : ""}
            {filtered.length > 0 && <> · jouées {pct(filtered.filter(r => r.played > 0).length, filtered.length)} ·
                réussite moyenne <Rate correct={filtered.reduce((s, r) => s + r.correct, 0)} total={filtered.reduce((s, r) => s + r.played, 0)}/></>}
        </p>

        {sorted.length === 0 ? <p className="admin-empty">Aucune question ne correspond.</p> : (
            <div className="stats-section quizz-bank">
                <table className="stats-table">
                    <thead>
                    <tr>
                        <SortTh k="topic" sort={sort} onSort={toggleSort} className="text">Thème</SortTh>
                        <SortTh k="question" sort={sort} onSort={toggleSort} className="text">Question</SortTh>
                        <th className="text">Bonne réponse</th>
                        <th className="text">Mauvaises réponses</th>
                        <SortTh k="date" sort={sort} onSort={toggleSort} className="text">Source</SortTh>
                        <SortTh k="played" sort={sort} onSort={toggleSort}>Jouée</SortTh>
                        <SortTh k="rate" sort={sort} onSort={toggleSort}>Réussite</SortTh>
                        <SortTh k="time" sort={sort} onSort={toggleSort}>Temps</SortTh>
                    </tr>
                    </thead>
                    <tbody>
                    {sorted.slice(0, shown).map(r => {
                        const topic = topicOf(r.topicId);
                        return (
                            <tr key={r.key} className={r.status !== "approved" ? `quizz-bank-${r.status}` : ""}>
                                <td className="text quizz-bank-topic">
                                    <button type="button" title="Voir les questions de ce thème" onClick={() => set("theme", r.topicId)}>
                                        <i className="stats-dot" style={{background: topic?.color ?? "#94a3b8"}}/>{topic?.name ?? r.topicId}
                                    </button>
                                    <small>{topic ? categoryLabel(topic.category) : ""}</small>
                                </td>
                                <td className="text quizz-bank-question">{r.question}</td>
                                <td className="text quizz-bank-right">{r.answers[0]}</td>
                                <td className="text quizz-bank-wrong">{r.answers.slice(1).join(" · ")}</td>
                                <td className="text quizz-bank-source">
                                    {r.source === "site" ? <span className="quizz-bank-tag">Site</span> : <>
                                        <span className={`quizz-bank-tag ${r.status}`}>{r.status === "approved" ? "Joueur" : STATUS_LABELS[r.status]}</span>
                                        <small>{r.author ?? "compte supprimé"}{r.createdAt && ` · ${dateTime(r.createdAt)}`}</small>
                                    </>}
                                </td>
                                <td>{r.played ? fmt(r.played) : <small>jamais</small>}
                                    {r.timeouts > 0 && <small title="Temps écoulé"> · {r.timeouts} ⏱</small>}</td>
                                <td><Rate correct={r.correct} total={r.played}/></td>
                                <td>{seconds(r.avgMs)}</td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
                {sorted.length > shown && (
                    <div className="admin-actions quizz-bank-more">
                        <button type="button" onClick={() => setShown(n => n + PAGE)}>Afficher {Math.min(PAGE, sorted.length - shown)} de plus ({fmt(sorted.length - shown)} restantes)</button>
                    </div>
                )}
            </div>
        )}
    </>;
}

// En-tête de colonne triable
function SortTh({k, sort, onSort, children, className}: {
    k: SortKey;
    sort: { key: SortKey; dir: 1 | -1 };
    onSort: (key: SortKey) => void;
    children: ReactNode;
    className?: string;
}) {
    return (
        <th className={`quizz-bank-sort ${className ?? ""}`} aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
            <button type="button" onClick={() => onSort(k)}>
                {children} {sort.key !== k ? <FaSort aria-hidden/> : sort.dir === 1 ? <FaSortUp aria-hidden/> : <FaSortDown aria-hidden/>}
            </button>
        </th>
    );
}
