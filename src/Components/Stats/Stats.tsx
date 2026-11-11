import "./Stats.scss";
import {useCallback, useEffect, useMemo, useState} from "react";
import {Navigate, useSearchParams} from "react-router-dom";
import {FaDownload, FaSyncAlt} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {statsService} from "../../Services/stats.service.ts";
import FeedbackAdmin from "../Feedback/FeedbackAdmin.tsx";
import type {StatsData} from "../../Models/stats.model.ts";
import {ApiError} from "../../api/api.ts";
import BarChart from "./BarChart.tsx";
import {Legend, Tile} from "./StatsWidgets.tsx";
import {dateTime, duration, fmt, longDay, pct, shortDay} from "./statsFormat.ts";
import CasinoStats from "./CasinoStats.tsx";
import ShopStats from "./ShopStats.tsx";
import {downloadFile, toCsv} from "./exportData.ts";
import StatsFilters from "./StatsFilters.tsx";
import {filterFromParams, filterParams, type StatsFilter, timelineTitle} from "./statsFilter.ts";

import Loader from "../Loader/Loader.tsx";
// Une couleur fixe par jeu (vérifiée lisible et distincte, daltonisme compris) ; les autres jeux en gris
const GAME_COLORS: Record<string, string> = {SUDOKU: "#3987e5", BINERO: "#e46f24", RIKUDO: "#1baf7a", TECTONIC: "#9085e9", GALAXIES: "#d55181", SHIKAKU: "#c98500", QUEENS: "#008300"};
const OTHER_COLOR = "#94a3b8";
const gameColor = (code: string) => GAME_COLORS[code] ?? OTHER_COLOR;

const WEEKDAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const DEVICE_LABELS = {mobile: "Téléphone", tablet: "Tablette", desktop: "Ordinateur", unknown: "Inconnu"} as const;


/**
 * Page Statistiques (administrateur uniquement), en trois onglets (?onglet=hasard, ?onglet=boutique) :
 * - Puzzles : joueurs, parties, jeux, défis du jour, rythme de jeu ; données brutes en JSON (tout) ou CSV (parties)
 * - Hasard : Plinko et roulette (CasinoStats)
 * - Boutique : achats et fonds portés (ShopStats)
 * Les retours des joueurs sont au-dessus des onglets.
 * Sous les onglets, une barre de filtres : période (à la minute près) et jeu (puzzles, ou Plinko / roulette),
 * gardés dans l'adresse de la page (voir statsFilter.ts). La période reste en changeant d'onglet, le jeu non.
 */

// Jeux de hasard proposés dans le filtre
const CASINO_GAMES = [{code: "plinko", name: "Plinko"}, {code: "roulette", name: "Roulette"}];
export default function Stats() {
    const {isLoggedIn, isAdmin, username} = useAuth();
    const [params, setParams] = useSearchParams();
    const onglet = params.get("onglet");
    const tab = onglet === "hasard" || onglet === "boutique" ? onglet : "puzzles";
    const paramsKey = params.toString();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const filter = useMemo(() => filterFromParams(params), [paramsKey]);
    const setFilter = (next: StatsFilter) => setParams({...(onglet ? {onglet} : {}), ...filterParams(next)}, {replace: true});
    // Changer d'onglet garde la période mais pas le jeu (les jeux diffèrent d'un onglet à l'autre)
    const openTab = (next: string | null) => setParams({...(next ? {onglet: next} : {}), ...filterParams({...filter, game: null})}, {replace: true});
    const [data, setData] = useState<StatsData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);

    const load = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        setError(null);
        try {
            setData(await statsService.get(filter, signal));
        } catch (err) {
            if ((err as Error).name === "AbortError") return;
            setError(err instanceof ApiError && err.status === 403
                ? "Accès réservé à l'administrateur."
                : (err as Error).message || "Impossible de charger les statistiques");
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        if (!isAdmin || tab !== "puzzles") return;
        const controller = new AbortController();
        const timer = window.setTimeout(() => void load(controller.signal), 0);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [isAdmin, load, tab]);

    const exportData = async (format: "json" | "csv") => {
        setExporting(true);
        try {
            const raw = await statsService.export();
            const stamp = raw.exportedAt.slice(0, 10);
            if (format === "json") downloadFile(`jokr-stats-${stamp}.json`, JSON.stringify(raw, null, 2), "application/json");
            else downloadFile(`jokr-parties-${stamp}.csv`, toCsv(raw.sessions), "text/csv;charset=utf-8");
        } catch (err) {
            setError((err as Error).message || "Export impossible");
        } finally {
            setExporting(false);
        }
    };

    if (!isLoggedIn) return <Navigate to="/login" replace/>;
    // Profil pas encore chargé : on ne sait pas encore si le joueur est administrateur
    if (!username) return <Loader/>;
    if (!isAdmin) return <p className="stats-status">Cette page est réservée à l'administrateur.</p>;

    return (
        <div className="stats">
            <div className="stats-card">
                <div className="stats-head">
                    <div>
                        <h1>Statistiques</h1>
                        {data && tab === "puzzles" && <p className="stats-sub">Mises à jour le {dateTime(data.generatedAt)}
                            {data.overview.sessions.firstStarted && <> · données depuis le {dateTime(data.overview.sessions.firstStarted)}</>}</p>}
                    </div>
                    {tab === "puzzles" && <div className="stats-actions">
                        <button type="button" onClick={() => void load()} disabled={loading}>
                            <FaSyncAlt aria-hidden/> Actualiser
                        </button>
                        <button type="button" onClick={() => void exportData("json")} disabled={exporting}>
                            <FaDownload aria-hidden/> Tout (JSON)
                        </button>
                        <button type="button" onClick={() => void exportData("csv")} disabled={exporting}>
                            <FaDownload aria-hidden/> Parties (CSV)
                        </button>
                    </div>}
                </div>

                <FeedbackAdmin/>

                <div className="stats-tabs" role="tablist">
                    <button type="button" role="tab" aria-selected={tab === "puzzles"} className={tab === "puzzles" ? "active" : ""}
                            onClick={() => openTab(null)}>Puzzles</button>
                    <button type="button" role="tab" aria-selected={tab === "hasard"} className={tab === "hasard" ? "active" : ""}
                            onClick={() => openTab("hasard")}>Hasard</button>
                    <button type="button" role="tab" aria-selected={tab === "boutique"} className={tab === "boutique" ? "active" : ""}
                            onClick={() => openTab("boutique")}>Boutique</button>
                </div>

                <StatsFilters value={filter} onChange={setFilter}
                              games={tab === "puzzles" ? data?.gameList ?? null : tab === "hasard" ? CASINO_GAMES : null}/>

                {tab === "hasard" ? <CasinoStats filter={filter}/> : tab === "boutique" ? <ShopStats filter={filter}/> : <>
                    {error && <p className="stats-status stats-error" role="alert">{error}</p>}
                    {!data && !error && <Loader label="Chargement des statistiques…"/>}
                    {data && <div className="fade-in"><StatsContent data={data} filter={filter}/></div>}
                </>}
            </div>
        </div>
    );
}

function StatsContent({data, filter}: { data: StatsData; filter: StatsFilter }) {
    const period = timelineTitle(filter);
    const {users, sessions, rewards, daily} = data.overview;
    const gameName = (code: string) => data.games.find(g => g.code === code)?.name ?? code;
    const totalDevices = data.games.reduce((acc, g) => {
        for (const key of Object.keys(acc) as (keyof typeof acc)[]) acc[key] += g.devices[key];
        return acc;
    }, {mobile: 0, tablet: 0, desktop: 0, unknown: 0});

    return (
        <>
            {/* ---------- Chiffres clés */}
            <section className="stats-tiles">
                <Tile label="Joueurs inscrits" value={fmt(users.total)}
                      detail={`+${users.new1} aujourd'hui · +${users.new7} en 7 j · +${users.new30} en 30 j`}/>
                <Tile label="Joueurs actifs" value={fmt(users.active7)}
                      detail={`7 derniers jours · ${users.active1} aujourd'hui · ${users.active30} en 30 j`}/>
                <Tile label="Parties lancées" value={fmt(sessions.started)}
                      detail={`${sessions.started1} aujourd'hui · ${sessions.started7} en 7 j · ${sessions.started30} en 30 j`}/>
                <Tile label="Parties terminées" value={fmt(sessions.finished)}
                      detail={`${pct(sessions.finished, sessions.started)} des parties lancées`}/>
                <Tile label="Abandons" value={fmt(sessions.abandoned)}
                      detail={`${pct(sessions.abandoned, sessions.started)} · ${sessions.inProgress} en cours`}/>
                <Tile label="Parties d'invités" value={pct(sessions.guests, sessions.started)}
                      detail={`${fmt(sessions.guests)} parties sans compte`}/>
                <Tile label="Défis du jour réussis" value={fmt(daily.completions)}
                      detail={`${daily.completions30} en 30 j · ${daily.players} joueurs · ${daily.challenges} grilles`}/>
                <Tile label="Grilles fausses envoyées" value={fmt(sessions.failedAttempts)}
                      detail="Avant une victoire"/>
                <Tile label="XP distribuée" value={fmt(rewards.xp)}
                      detail={`${fmt(rewards.wins)} victoires de joueurs connectés`}/>
                <Tile label="Crédits" value={fmt(users.creditsHeld)}
                      detail={`détenus · ${fmt(rewards.credits)} gagnés au total`}/>
                <Tile label="Niveaux" value={`${users.avgLevel.toFixed(1)}`}
                      detail={`niveau moyen · ${users.maxLevel} au plus haut`}/>
                <Tile label="Joueurs connectés qui jouent" value={fmt(sessions.players7)}
                      detail={`7 derniers jours · ${sessions.players30} en 30 j`}/>
            </section>

            {/* ---------- Activité */}
            <section className="stats-section">
                <h2>Parties lancées, {period}</h2>
                <Legend items={data.games.map(g => ({label: g.name, color: gameColor(g.code)}))}/>
                <BarChart ariaLabel="Parties lancées par jour et par jeu" labelEvery={5}
                          bars={data.timeline.map(t => ({
                              label: shortDay(t.day),
                              title: longDay(t.day),
                              value: t.started,
                              segments: data.games.map(g => ({key: g.code, label: g.name, value: t.byGame[g.code] ?? 0, color: gameColor(g.code)})),
                          }))}/>
                <details className="stats-table-toggle">
                    <summary>Voir le tableau jour par jour</summary>
                    <div className="stats-table-wrap">
                        <table className="stats-table">
                            <thead><tr><th>Jour</th><th>Lancées</th><th>Terminées</th><th>Joueurs connectés</th><th>Nouveaux comptes</th><th>Défis réussis</th>
                                {data.games.map(g => <th key={g.code}>{g.name}</th>)}</tr></thead>
                            <tbody>
                            {[...data.timeline].reverse().map(t => (
                                <tr key={t.day}>
                                    <td>{shortDay(t.day)}</td><td>{t.started}</td><td>{t.finished}</td><td>{t.players}</td>
                                    <td>{t.newUsers}</td><td>{t.dailyCompletions}</td>
                                    {data.games.map(g => <td key={g.code}>{t.byGame[g.code] ?? 0}</td>)}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </details>
            </section>

            <section className="stats-section stats-two">
                <div>
                    <h2>Nouveaux comptes, {period}</h2>
                    <BarChart ariaLabel="Nouveaux comptes par jour" labelEvery={5}
                              bars={data.timeline.map(t => ({label: shortDay(t.day), value: t.newUsers}))}/>
                </div>
                <div>
                    <h2>Défis du jour réussis, {period}</h2>
                    <BarChart ariaLabel="Défis du jour réussis par jour" labelEvery={5}
                              bars={data.timeline.map(t => ({label: shortDay(t.day), value: t.dailyCompletions}))}/>
                </div>
            </section>

            {/* ---------- Jeux */}
            <section className="stats-section">
                <h2>Par jeu</h2>
                <div className="stats-table-wrap">
                    <table className="stats-table">
                        <thead>
                        <tr>
                            <th>Jeu</th><th>Lancées</th><th>30 j</th><th>Terminées</th><th>Réussite</th><th>Abandons</th>
                            <th>Joueurs</th><th>Invités</th><th>Temps moyen</th><th>Temps médian</th><th>Record</th><th>Grilles fausses</th>
                        </tr>
                        </thead>
                        <tbody>
                        {data.games.map(g => (
                            <tr key={g.code}>
                                <td><i className="stats-dot" style={{background: gameColor(g.code)}}/>{g.name}</td>
                                <td>{fmt(g.started)}</td><td>{fmt(g.started30)}</td><td>{fmt(g.finished)}</td>
                                <td>{pct(g.finished, g.started)}</td><td>{fmt(g.abandoned)}</td><td>{fmt(g.players)}</td>
                                <td>{pct(g.guests, g.started)}</td><td>{duration(g.avgMs)}</td><td>{duration(g.medianMs)}</td>
                                <td>{duration(g.bestMs)}</td><td>{fmt(g.failedAttempts)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="stats-section stats-two">
                <div>
                    <h2>Modes de jeu</h2>
                    <div className="stats-table-wrap">
                        <table className="stats-table">
                            <thead><tr><th>Jeu</th><th>Partie libre</th><th>Défi du jour</th><th>Défi rejoué</th></tr></thead>
                            <tbody>
                            {data.games.map(g => (
                                <tr key={g.code}>
                                    <td>{g.name}</td>
                                    <td>{fmt(g.modes.free)} <small>{pct(g.modes.free, g.started)}</small></td>
                                    <td>{fmt(g.modes.daily)} <small>{pct(g.modes.daily, g.started)}</small></td>
                                    <td>{fmt(g.modes.replay)} <small>{pct(g.modes.replay, g.started)}</small></td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div>
                    <h2>Appareils</h2>
                    <div className="stats-table-wrap">
                        <table className="stats-table">
                            <thead><tr><th>Jeu</th>{Object.values(DEVICE_LABELS).map(l => <th key={l}>{l}</th>)}</tr></thead>
                            <tbody>
                            {data.games.map(g => (
                                <tr key={g.code}>
                                    <td>{g.name}</td>
                                    {(Object.keys(DEVICE_LABELS) as (keyof typeof DEVICE_LABELS)[]).map(k => (
                                        <td key={k}>{fmt(g.devices[k])} <small>{pct(g.devices[k], g.started)}</small></td>
                                    ))}
                                </tr>
                            ))}
                            <tr className="stats-total">
                                <td>Total</td>
                                {(Object.keys(DEVICE_LABELS) as (keyof typeof DEVICE_LABELS)[]).map(k => (
                                    <td key={k}>{fmt(totalDevices[k])} <small>{pct(totalDevices[k], sessions.started)}</small></td>
                                ))}
                            </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* ---------- Rythme */}
            <section className="stats-section stats-two">
                <div>
                    <h2>Heure de lancement (heure française)</h2>
                    <BarChart ariaLabel="Parties lancées par heure de la journée" labelEvery={3}
                              bars={data.rhythm.byHour.map((n, h) => ({label: `${h}h`, title: `${h}h – ${h + 1}h`, value: n}))}/>
                </div>
                <div>
                    <h2>Jour de la semaine</h2>
                    {/* Semaine du lundi au dimanche */}
                    <BarChart ariaLabel="Parties lancées par jour de la semaine"
                              bars={[1, 2, 3, 4, 5, 6, 0].map(d => ({label: WEEKDAYS[d], value: data.rhythm.byWeekday[d]}))}/>
                </div>
            </section>

            {/* ---------- Réglages */}
            <section className="stats-section">
                <h2>Réglages choisis</h2>
                <p className="stats-note">Taille de grille et nombre de cases à remplir (aide donnée pour les Galaxies, le Shikaku et le Queens), toutes parties confondues.</p>
                <div className="stats-configs">
                    {data.games.map(g => {
                        const rows = data.configs.filter(c => c.gameCode === g.code).sort((a, b) => b.started - a.started);
                        if (rows.length === 0) return null;
                        return (
                            <div key={g.code} className="stats-table-wrap">
                                <table className="stats-table">
                                    <caption><i className="stats-dot" style={{background: gameColor(g.code)}}/>{g.name}</caption>
                                    <thead><tr><th>Taille</th><th>{g.code === "GALAXIES" ? "Murs donnés" : g.code === "SHIKAKU" ? "Rectangles donnés" : g.code === "QUEENS" ? "Dames données" : "Cases"}</th><th>Lancées</th><th>Réussite</th><th>Temps médian</th></tr></thead>
                                    <tbody>
                                    {rows.map(c => (
                                        <tr key={`${c.gridSize}-${c.emptyCells}`}>
                                            <td>{g.code === "RIKUDO" ? `${c.gridSize} cases` : `${c.gridSize}×${c.gridSize}`}</td>
                                            <td>{c.emptyCells}</td><td>{fmt(c.started)}</td>
                                            <td>{pct(c.finished, c.started)}</td><td>{duration(c.medianMs)}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ---------- Défis du jour */}
            <section className="stats-section">
                <h2>Défis du jour, {period}</h2>
                {data.daily.length === 0 ? <p className="stats-note">Aucun défi sur la période.</p> : (
                    <div className="stats-table-wrap">
                        <table className="stats-table">
                            <thead><tr><th>Jour</th><th className="text">Jeu</th><th>Lancés</th><th>Réussis</th><th>Temps médian</th></tr></thead>
                            <tbody>
                            {data.daily.map(d => (
                                <tr key={`${d.day}-${d.gameCode}`}>
                                    <td>{shortDay(d.day)}</td>
                                    <td className="text"><i className="stats-dot" style={{background: gameColor(d.gameCode)}}/>{gameName(d.gameCode)}</td>
                                    <td>{d.started}</td><td>{d.completions}</td><td>{duration(d.medianMs)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* ---------- Joueurs */}
            <section className="stats-section stats-two">
                <div>
                    <h2>Niveaux des joueurs</h2>
                    <BarChart ariaLabel="Nombre de joueurs par tranche de niveaux"
                              bars={data.levels.map(l => ({label: `${Math.max(1, l.from)}–${l.to}`, title: `Niveaux ${Math.max(1, l.from)} à ${l.to}`, value: l.players}))}/>
                </div>
                <div>
                    <h2>Répartition des appareils</h2>
                    <BarChart ariaLabel="Parties lancées par type d'appareil"
                              bars={(Object.keys(DEVICE_LABELS) as (keyof typeof DEVICE_LABELS)[]).map(k => ({label: DEVICE_LABELS[k], value: totalDevices[k]}))}/>
                </div>
            </section>

            <section className="stats-section">
                <h2>Joueurs les plus actifs</h2>
                <div className="stats-table-wrap">
                    <table className="stats-table">
                        <thead>
                        <tr><th>Joueur</th><th>Niveau</th><th>Crédits</th><th>Lancées</th><th>Terminées</th><th>Défis</th>
                            <th>Inscrit le</th><th>Dernière partie</th><th>Dernière activité</th></tr>
                        </thead>
                        <tbody>
                        {data.topPlayers.map(p => (
                            <tr key={p.username}>
                                <td>{p.username}</td><td>{p.level}</td><td>{fmt(p.credits)}</td><td>{fmt(p.started)}</td>
                                <td>{fmt(p.finished)}</td><td>{fmt(p.dailyCompletions)}</td><td>{dateTime(p.createdAt)}</td>
                                <td>{dateTime(p.lastGame)}</td><td>{dateTime(p.lastSeenAt)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </>
    );
}
