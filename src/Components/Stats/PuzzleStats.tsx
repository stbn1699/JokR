/**
 * Statistiques des puzzles (console d'administration), en quatre pages qui partagent les mêmes données :
 * - Activité : chiffres clés, parties lancées jour par jour, nouveaux comptes, rythme de jeu
 * - Jeux : tableau par jeu, modes, appareils, réglages choisis
 * - Défis du jour : réussites jour par jour et détail de chaque défi
 * - Joueurs : niveaux et joueurs les plus actifs
 * Filtres : période et jeu (voir statsFilter.ts).
 */

import type {ReactNode} from "react";
import {statsService} from "../../Services/stats.service.ts";
import type {StatsData} from "../../Models/stats.model.ts";
import AdminPage, {StatsBody} from "../Admin/AdminPage.tsx";
import {filterKey, useAdminFilter} from "../Admin/useAdminFilter.ts";
import {useStatsData} from "../Admin/useStatsData.ts";
import BarChart from "./BarChart.tsx";
import {Legend, Tile} from "./StatsWidgets.tsx";
import {dateTime, duration, fmt, longDay, pct, shortDay} from "./statsFormat.ts";
import {type StatsFilter, timelineTitle} from "./statsFilter.ts";

// Une couleur fixe par jeu (vérifiée lisible et distincte, daltonisme compris) ; les autres jeux en gris
const GAME_COLORS: Record<string, string> = {SUDOKU: "#3987e5", BINERO: "#e46f24", RIKUDO: "#1baf7a", TECTONIC: "#9085e9", GALAXIES: "#d55181", SHIKAKU: "#c98500", QUEENS: "#008300", TRACE: "#0ea5e9", DEVIMOT: "#ec4899", ECHELLE: "#db2777", MOTSMELES: "#f472b6", MOTSACASER: "#be185d", COLORIA: "#14b8a6", TUYAUX: "#0284c7", LIENS: "#7c3aed", BOUCHON: "#ca8a04", PATURAGES: "#65a30d", BOUCLE: "#2563eb", DEMINEUR: "#dc2626"};
const OTHER_COLOR = "#94a3b8";
const gameColor = (code: string) => GAME_COLORS[code] ?? OTHER_COLOR;

const WEEKDAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const DEVICE_LABELS = {mobile: "Téléphone", tablet: "Tablette", desktop: "Ordinateur", unknown: "Inconnu"} as const;
const DEVICE_KEYS = Object.keys(DEVICE_LABELS) as (keyof typeof DEVICE_LABELS)[];

// Ce que compte la deuxième colonne des réglages, selon le jeu
const CONFIG_LABELS: Record<string, string> = {
    GALAXIES: "Murs donnés", SHIKAKU: "Rectangles donnés", QUEENS: "Dames données", TRACE: "Numéros en plus", DEVIMOT: "Essais",
    ECHELLE: "Étapes", MOTSMELES: "Mots", MOTSACASER: "Mots placés", COLORIA: "Couleurs", TUYAUX: "Cases données", LIENS: "Paires",
    BOUCHON: "Coups", PATURAGES: "Carrés donnés", BOUCLE: "Murs", DEMINEUR: "Mines",
};

// Page de statistiques des puzzles : en-tête, filtres, chargement partagé
function PuzzlePage({title, description, children}: {
    title: string;
    description: string;
    children: (data: StatsData, filter: StatsFilter) => ReactNode;
}) {
    const [filter] = useAdminFilter();
    const {data, error, loading, reload} = useStatsData(`puzzles?${filterKey(filter)}`, signal => statsService.get(filter, signal));
    return (
        <AdminPage group="Puzzles" title={title} description={description} filters={data?.gameList ?? null}
                   onRefresh={reload} refreshing={loading}
                   meta={data && <>Mis à jour le {dateTime(data.generatedAt)}
                       {data.overview.sessions.firstStarted && <> · données depuis le {dateTime(data.overview.sessions.firstStarted)}</>}</>}>
            <StatsBody data={data} error={error} label="Chargement des statistiques…">{d => children(d, filter)}</StatsBody>
        </AdminPage>
    );
}

const totalDevices = (data: StatsData) => data.games.reduce((acc, g) => {
    for (const key of DEVICE_KEYS) acc[key] += g.devices[key];
    return acc;
}, {mobile: 0, tablet: 0, desktop: 0, unknown: 0});

// ---------------------------------------------------------------- Activité

export function PuzzleActivity() {
    return (
        <PuzzlePage title="Activité" description="Parties lancées et terminées, nouveaux comptes et rythme de jeu.">
            {(data, filter) => {
                const period = timelineTitle(filter);
                const {users, sessions} = data.overview;
                return <>
                    <section className="stats-tiles">
                        <Tile label="Parties lancées" value={fmt(sessions.started)}
                              detail={`${sessions.started1} aujourd'hui · ${sessions.started7} en 7 j · ${sessions.started30} en 30 j`}/>
                        <Tile label="Parties terminées" value={fmt(sessions.finished)}
                              detail={`${pct(sessions.finished, sessions.started)} des parties lancées`}/>
                        <Tile label="Abandons" value={fmt(sessions.abandoned)}
                              detail={`${pct(sessions.abandoned, sessions.started)} · ${sessions.inProgress} en cours`}/>
                        <Tile label="Parties d'invités" value={pct(sessions.guests, sessions.started)}
                              detail={`${fmt(sessions.guests)} parties sans compte`}/>
                        <Tile label="Joueurs actifs" value={fmt(users.active7)}
                              detail={`7 derniers jours · ${users.active1} aujourd'hui · ${users.active30} en 30 j`}/>
                        <Tile label="Grilles fausses envoyées" value={fmt(sessions.failedAttempts)} detail="Avant une victoire"/>
                    </section>

                    <section className="stats-section">
                        <h2>Parties lancées, {period}</h2>
                        <Legend items={data.games.map(g => ({label: g.name, color: gameColor(g.code)}))}/>
                        <BarChart ariaLabel="Parties lancées par jour et par jeu" labelEvery={3}
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

                    <section className="stats-three">
                        <div className="stats-section">
                            <h2>Nouveaux comptes, {period}</h2>
                            <BarChart ariaLabel="Nouveaux comptes par jour" labelEvery={5}
                                      bars={data.timeline.map(t => ({label: shortDay(t.day), title: longDay(t.day), value: t.newUsers}))}/>
                        </div>
                        <div className="stats-section">
                            <h2>Heure de lancement</h2>
                            <BarChart ariaLabel="Parties lancées par heure de la journée (heure française)" labelEvery={3}
                                      bars={data.rhythm.byHour.map((n, h) => ({label: `${h}h`, title: `${h}h – ${h + 1}h`, value: n}))}/>
                        </div>
                        <div className="stats-section">
                            <h2>Jour de la semaine</h2>
                            {/* Semaine du lundi au dimanche */}
                            <BarChart ariaLabel="Parties lancées par jour de la semaine"
                                      bars={[1, 2, 3, 4, 5, 6, 0].map(d => ({label: WEEKDAYS[d], value: data.rhythm.byWeekday[d]}))}/>
                        </div>
                    </section>
                </>;
            }}
        </PuzzlePage>
    );
}

// ---------------------------------------------------------------- Jeux

export function PuzzleGames() {
    return (
        <PuzzlePage title="Jeux" description="Chaque jeu : volume, réussite, temps, modes, appareils et réglages choisis.">
            {data => {
                const devices = totalDevices(data);
                const started = data.overview.sessions.started;
                return <>
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

                    <section className="stats-two">
                        <div className="stats-section">
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
                        <div className="stats-section">
                            <h2>Appareils</h2>
                            <BarChart ariaLabel="Parties lancées par type d'appareil"
                                      bars={DEVICE_KEYS.map(k => ({label: DEVICE_LABELS[k], value: devices[k]}))}/>
                            <div className="stats-table-wrap">
                                <table className="stats-table">
                                    <thead><tr><th>Jeu</th>{Object.values(DEVICE_LABELS).map(l => <th key={l}>{l}</th>)}</tr></thead>
                                    <tbody>
                                    {data.games.map(g => (
                                        <tr key={g.code}>
                                            <td>{g.name}</td>
                                            {DEVICE_KEYS.map(k => <td key={k}>{fmt(g.devices[k])} <small>{pct(g.devices[k], g.started)}</small></td>)}
                                        </tr>
                                    ))}
                                    <tr className="stats-total">
                                        <td>Total</td>
                                        {DEVICE_KEYS.map(k => <td key={k}>{fmt(devices[k])} <small>{pct(devices[k], started)}</small></td>)}
                                    </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    <section className="stats-section">
                        <h2>Réglages choisis</h2>
                        <p className="stats-note">Taille de grille et nombre de cases à remplir (aide donnée pour les Galaxies, le Shikaku, le Queens et le Tracé), toutes parties confondues.</p>
                        <div className="stats-configs">
                            {data.games.map(g => {
                                const rows = data.configs.filter(c => c.gameCode === g.code).sort((a, b) => b.started - a.started);
                                if (rows.length === 0) return null;
                                return (
                                    <div key={g.code} className="stats-table-wrap">
                                        <table className="stats-table">
                                            <caption><i className="stats-dot" style={{background: gameColor(g.code)}}/>{g.name}</caption>
                                            <thead><tr><th>Taille</th><th>{CONFIG_LABELS[g.code] ?? "Cases"}</th><th>Lancées</th><th>Réussite</th><th>Temps médian</th></tr></thead>
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
                </>;
            }}
        </PuzzlePage>
    );
}

// ---------------------------------------------------------------- Défis du jour

export function PuzzleDaily() {
    return (
        <PuzzlePage title="Défis du jour" description="Réussites jour par jour et détail de chaque défi.">
            {(data, filter) => {
                const {daily} = data.overview;
                const gameName = (code: string) => data.games.find(g => g.code === code)?.name ?? code;
                return <>
                    <section className="stats-tiles">
                        <Tile label="Défis réussis" value={fmt(daily.completions)} detail={`${daily.completions30} ces 30 derniers jours`}/>
                        <Tile label="Joueurs" value={fmt(daily.players)} detail="ont réussi au moins un défi"/>
                        <Tile label="Grilles proposées" value={fmt(daily.challenges)} detail="défis du jour, tous jeux"/>
                    </section>

                    <section className="stats-section">
                        <h2>Défis réussis, {timelineTitle(filter)}</h2>
                        <BarChart ariaLabel="Défis du jour réussis par jour" labelEvery={3}
                                  bars={data.timeline.map(t => ({label: shortDay(t.day), title: longDay(t.day), value: t.dailyCompletions}))}/>
                    </section>

                    <section className="stats-section">
                        <h2>Défi par défi</h2>
                        {data.daily.length === 0 ? <p className="stats-note">Aucun défi sur la période.</p> : (
                            <div className="stats-table-wrap stats-table-tall">
                                <table className="stats-table">
                                    <thead><tr><th>Jour</th><th className="text">Jeu</th><th>Lancés</th><th>Réussis</th><th>Réussite</th><th>Temps médian</th></tr></thead>
                                    <tbody>
                                    {data.daily.map(d => (
                                        <tr key={`${d.day}-${d.gameCode}`}>
                                            <td>{shortDay(d.day)}</td>
                                            <td className="text"><i className="stats-dot" style={{background: gameColor(d.gameCode)}}/>{gameName(d.gameCode)}</td>
                                            <td>{d.started}</td><td>{d.completions}</td><td>{pct(d.completions, d.started)}</td><td>{duration(d.medianMs)}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </>;
            }}
        </PuzzlePage>
    );
}

// ---------------------------------------------------------------- Joueurs

export function PuzzlePlayers() {
    return (
        <PuzzlePage title="Joueurs" description="Comptes, niveaux, crédits et joueurs les plus actifs.">
            {data => {
                const {users, sessions, rewards} = data.overview;
                return <>
                    <section className="stats-tiles">
                        <Tile label="Joueurs inscrits" value={fmt(users.total)}
                              detail={`+${users.new1} aujourd'hui · +${users.new7} en 7 j · +${users.new30} en 30 j`}/>
                        <Tile label="Joueurs actifs" value={fmt(users.active7)}
                              detail={`7 derniers jours · ${users.active1} aujourd'hui · ${users.active30} en 30 j`}/>
                        <Tile label="Joueurs connectés qui jouent" value={fmt(sessions.players7)}
                              detail={`7 derniers jours · ${sessions.players30} en 30 j`}/>
                        <Tile label="Niveaux" value={`${users.avgLevel.toFixed(1)}`}
                              detail={`niveau moyen · ${users.maxLevel} au plus haut`}/>
                        <Tile label="XP distribuée" value={fmt(rewards.xp)}
                              detail={`${fmt(rewards.wins)} victoires de joueurs connectés`}/>
                        <Tile label="Crédits" value={fmt(users.creditsHeld)}
                              detail={`détenus · ${fmt(rewards.credits)} gagnés au total`}/>
                    </section>

                    <section className="stats-two stats-two-wide">
                        <div className="stats-section">
                            <h2>Niveaux des joueurs</h2>
                            <BarChart ariaLabel="Nombre de joueurs par tranche de niveaux"
                                      bars={data.levels.map(l => ({label: `${Math.max(1, l.from)}–${l.to}`, title: `Niveaux ${Math.max(1, l.from)} à ${l.to}`, value: l.players}))}/>
                        </div>
                        <div className="stats-section">
                            <h2>Joueurs les plus actifs</h2>
                            <div className="stats-table-wrap stats-table-tall">
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
                        </div>
                    </section>
                </>;
            }}
        </PuzzlePage>
    );
}
