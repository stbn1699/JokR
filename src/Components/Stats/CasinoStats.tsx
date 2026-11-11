/**
 * Onglet « Hasard » de la page Statistiques (administrateur) : Plinko et roulette.
 * - chiffres clés : mises, crédits misés et rendus, bénéfice de la maison, joueurs, records
 * - par jeu : taux de retour observé face au taux attendu
 * - activité : crédits misés et rendus par jour, heures de jeu
 * - Plinko : cases atteintes (observé / attendu), mises choisies
 * - roulette : numéros sortis, couleurs, types de mises, numéros favoris, tours
 * - joueurs : plus gros gagnants et perdants, plus actifs, plus gros gains en une mise
 */

import {useCallback, useEffect, useState} from "react";
import {FaSyncAlt} from "react-icons/fa";
import {statsService} from "../../Services/stats.service.ts";
import type {CasinoStatsData} from "../../Models/casinoStats.model.ts";
import {PLINKO_ODDS, PLINKO_RISKS, PLINKO_RTP, PLINKO_SLOTS, PLINKO_TABLES} from "../../../backend/src/utils/plinko.ts";
import {rouletteColor} from "../../../backend/src/utils/roulette.ts";
import BarChart from "./BarChart.tsx";
import {Legend, Tile} from "./StatsWidgets.tsx";
import {dateTime, fmt, longDay, pct, pct1, shortDay} from "./statsFormat.ts";
import Loader from "../Loader/Loader.tsx";
import {hasPeriod, type StatsFilter, timelineTitle} from "./statsFilter.ts";

const GAMES: Record<string, { name: string; color: string; rtp: number }> = {
    plinko: {name: "Plinko", color: "#3987e5", rtp: PLINKO_RTP},
    roulette: {name: "Roulette", color: "#e46f24", rtp: 36 / 37},
};
const gameName = (game: string) => GAMES[game]?.name ?? game;
// Multiplicateurs d'une case du Plinko dans les trois tableaux (prudent · équilibré · risqué)
const slotGains = (slot: number) => PLINKO_RISKS.map(r => `×${String(PLINKO_TABLES[r][slot]).replace(".", ",")}`).join(" · ");
const ROULETTE_COLORS = {red: "#dc2626", black: "#475569", green: "#059669"} as const;

const BET_KINDS: Record<string, string> = {
    number: "Numéro (plein)", split: "À cheval", corner: "Carré", color: "Rouge / noir", parity: "Pair / impair",
    half: "1-18 / 19-36", dozen: "Douzaine", column: "Colonne", other: "Autre",
};

// Gain net signé : « +120 », « −40 »
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt(Math.abs(n))}`;

export default function CasinoStats({filter}: { filter: StatsFilter }) {
    const [data, setData] = useState<CasinoStatsData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        setError(null);
        try {
            setData(await statsService.casino(filter, signal));
        } catch (err) {
            if ((err as Error).name === "AbortError") return;
            setError((err as Error).message || "Impossible de charger les statistiques du hasard");
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => void load(controller.signal), 0);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [load]);

    return (
        <>
            <div className="stats-tab-head">
                {data && <p className="stats-sub">Mises à jour le {dateTime(data.generatedAt)}
                    {data.overview.first && <> · données depuis le {dateTime(data.overview.first)}</>}</p>}
                <div className="stats-actions">
                    <button type="button" onClick={() => void load()} disabled={loading}><FaSyncAlt aria-hidden/> Actualiser</button>
                </div>
            </div>
            {error && <p className="stats-status stats-error" role="alert">{error}</p>}
            {!data && !error && <Loader label="Chargement des statistiques du hasard…"/>}
            {data && (data.overview.plays === 0
                ? <p className="stats-note">{hasPeriod(filter) || filter.game ? "Aucune mise sur cette période." : "Personne n'a encore misé."}</p>
                : <div className="fade-in"><CasinoContent data={data} filter={filter}/></div>)}
        </>
    );
}

function CasinoContent({data, filter}: { data: CasinoStatsData; filter: StatsFilter }) {
    // filtre sur un seul jeu : on cache les parties de l'autre
    const showPlinko = filter.game !== "roulette";
    const showRoulette = filter.game !== "plinko";
    const o = data.overview;
    const house = o.wagered - o.paid;
    const rounds = data.rouletteRounds;
    const best = data.biggestWins[0];

    // couleurs et chances simples des numéros sortis
    const draws = data.rouletteNumbers.reduce((a, b) => a + b, 0);
    const drawsWhere = (test: (n: number) => boolean) => data.rouletteNumbers.reduce((sum, c, n) => sum + (test(n) ? c : 0), 0);
    const red = drawsWhere(n => rouletteColor(n) === "red");
    const black = drawsWhere(n => rouletteColor(n) === "black");
    const zero = data.rouletteNumbers[0] ?? 0;
    const even = drawsWhere(n => n !== 0 && n % 2 === 0);
    const low = drawsWhere(n => n >= 1 && n <= 18);
    const hot = [...data.rouletteNumbers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const cold = [...data.rouletteNumbers.entries()].sort((a, b) => a[1] - b[1]).slice(0, 5);

    const plinkoDrops = data.plinkoSlots.reduce((sum, s) => sum + s.drops, 0);
    const slotDrops = (slot: number) => data.plinkoSlots.find(s => s.slot === slot)?.drops ?? 0;

    const winners = [...data.players].filter(p => p.net > 0).sort((a, b) => b.net - a.net).slice(0, 10);
    const losers = [...data.players].filter(p => p.net < 0).sort((a, b) => a.net - b.net).slice(0, 10);
    const active = data.players.slice(0, 10);

    return (
        <>
            {/* ---------- Chiffres clés */}
            <section className="stats-tiles">
                <Tile label="Mises jouées" value={fmt(o.plays)}
                      detail={`${fmt(o.plays1)} sur 24 h · billes de Plinko et places aux tours de roulette`}/>
                <Tile label="Crédits misés" value={fmt(o.wagered)} detail={`${fmt(o.wagered1)} sur 24 h · ${fmt(o.wagered / o.plays)} par mise en moyenne`}/>
                <Tile label="Crédits rendus" value={fmt(o.paid)} detail={`${pct1(o.paid, o.wagered)} des mises (taux de retour)`}/>
                <Tile label="Bénéfice de la maison" value={signed(house)}
                      detail={`${pct1(house, o.wagered)} des mises · ${signed(o.wagered1 - o.paid1)} sur 24 h`}/>
                <Tile label="Joueurs" value={fmt(o.players)} detail={`${fmt(o.players7)} ces 7 derniers jours`}/>
                <Tile label="Mises gagnantes" value={pct(o.won, o.plays)}
                      detail={`${fmt(o.won)} ont rapporté plus que la mise · ${fmt(o.even)} remboursées tout juste`}/>
                <Tile label="Plus gros gain" value={best ? signed(best.payout - best.bet) : "–"}
                      detail={best ? `${best.username} · ${gameName(best.game)} · ${fmt(best.bet)} misés` : "Pas encore de gain"}/>
                <Tile label="Tours de roulette" value={fmt(rounds.drawn)}
                      detail={`${fmt(rounds.withBets)} avec des mises · ${pct(rounds.withBets, rounds.drawn)} des tours`}/>
                <Tile label="Joueurs par tour" value={rounds.withBets ? (rounds.seats / rounds.withBets).toFixed(1).replace(".", ",") : "–"}
                      detail={`tours avec des mises · ${rounds.maxPlayers} au plus sur un tour`}/>
                <Tile label="Plus gros pot" value={fmt(rounds.biggestPot)}
                      detail={`crédits sur un seul tour · ${rounds.withBets ? fmt(rounds.wagered / rounds.withBets) : "–"} par tour en moyenne`}/>
                <Tile label="Jetons posés" value={fmt(rounds.chips)}
                      detail={`sur le tapis · ${rounds.withBets ? (rounds.chips / Math.max(1, rounds.seats)).toFixed(1).replace(".", ",") : "–"} par joueur et par tour`}/>
                <Tile label="Billes de Plinko" value={fmt(plinkoDrops)}
                      detail={`${pct1(slotDrops(0) + slotDrops(PLINKO_SLOTS - 1), plinkoDrops)} dans les cases du bord`}/>
            </section>

            {/* ---------- Par jeu */}
            <section className="stats-section">
                <h2>Par jeu</h2>
                <div className="stats-table-wrap">
                    <table className="stats-table">
                        <thead>
                        <tr>
                            <th>Jeu</th><th>Mises</th><th>7 j</th><th>Joueurs</th><th>Misé</th><th>Rendu</th><th>Bénéfice</th>
                            <th>Retour observé</th><th>Retour attendu</th><th>Mise moyenne</th><th>Mises gagnantes</th><th>Plus gros gain</th>
                        </tr>
                        </thead>
                        <tbody>
                        {data.games.map(g => (
                            <tr key={g.game}>
                                <td><i className="stats-dot" style={{background: GAMES[g.game]?.color}}/>{gameName(g.game)}</td>
                                <td>{fmt(g.plays)}</td><td>{fmt(g.plays7)}</td><td>{fmt(g.players)}</td>
                                <td>{fmt(g.wagered)}</td><td>{fmt(g.paid)}</td><td>{signed(g.wagered - g.paid)}</td>
                                <td><strong>{pct1(g.paid, g.wagered)}</strong></td>
                                <td>{GAMES[g.game] ? pct1(GAMES[g.game]!.rtp, 1) : "–"}</td>
                                <td>{fmt(g.avgBet)}</td><td>{pct(g.won, g.plays)}</td><td>{signed(g.bestNet)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
                <p className="stats-note">Le taux de retour observé se rapproche de l'attendu à mesure que les mises s'accumulent ; avec peu de mises, un gros gain le fait varier beaucoup.</p>
            </section>

            {/* ---------- Activité */}
            <section className="stats-section stats-two">
                <div>
                    <h2>Crédits misés, {timelineTitle(filter)}</h2>
                    <Legend items={Object.values(GAMES).map(g => ({label: g.name, color: g.color}))}/>
                    <BarChart ariaLabel="Crédits misés par jour et par jeu" labelEvery={5}
                              bars={data.timeline.map(t => ({
                                  label: shortDay(t.day), title: longDay(t.day), value: Math.round(t.wagered),
                                  segments: Object.entries(GAMES).map(([key, g]) => ({key, label: g.name, value: Math.round(t.byGame[key]?.wagered ?? 0), color: g.color})),
                              }))}/>
                </div>
                <div>
                    <h2>Mises jouées, {timelineTitle(filter)}</h2>
                    <Legend items={Object.values(GAMES).map(g => ({label: g.name, color: g.color}))}/>
                    <BarChart ariaLabel="Mises jouées par jour et par jeu" labelEvery={5}
                              bars={data.timeline.map(t => ({
                                  label: shortDay(t.day), title: longDay(t.day), value: t.plays,
                                  segments: Object.entries(GAMES).map(([key, g]) => ({key, label: g.name, value: t.byGame[key]?.plays ?? 0, color: g.color})),
                              }))}/>
                </div>
            </section>
            <section className="stats-section">
                <details className="stats-table-toggle">
                    <summary>Voir le bilan jour par jour</summary>
                    <div className="stats-table-wrap">
                        <table className="stats-table">
                            <thead><tr><th>Jour</th><th>Mises</th><th>Misé</th><th>Rendu</th><th>Bénéfice</th><th>Retour</th>
                                {Object.values(GAMES).map(g => <th key={g.name}>{g.name}</th>)}</tr></thead>
                            <tbody>
                            {[...data.timeline].reverse().filter(t => t.plays > 0).map(t => (
                                <tr key={t.day}>
                                    <td>{shortDay(t.day)}</td><td>{fmt(t.plays)}</td><td>{fmt(t.wagered)}</td><td>{fmt(t.paid)}</td>
                                    <td>{signed(t.wagered - t.paid)}</td><td>{pct1(t.paid, t.wagered)}</td>
                                    {Object.keys(GAMES).map(key => <td key={key}>{fmt(t.byGame[key]?.plays ?? 0)}</td>)}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </details>
            </section>

            <section className="stats-section stats-two">
                <div>
                    <h2>Heure des mises (heure française)</h2>
                    <BarChart ariaLabel="Mises jouées par heure de la journée" labelEvery={3}
                              bars={data.hours.map(h => ({label: `${h.hour}h`, title: `${h.hour}h – ${h.hour + 1}h · ${fmt(h.wagered)} crédits misés`, value: h.plays}))}/>
                </div>
                {showPlinko && <div>
                    <h2>Plinko : mises choisies</h2>
                    <BarChart ariaLabel="Billes de Plinko par mise" color={GAMES.plinko!.color}
                              bars={data.plinkoBets.map(b => ({label: String(b.bet), title: `Mise de ${b.bet} · ${b.players} joueur(s)`, value: b.drops}))}/>
                </div>}
            </section>

            {/* ---------- Plinko */}
            {showPlinko && <section className="stats-section">
                <h2>Plinko : cases atteintes</h2>
                <BarChart ariaLabel="Billes de Plinko par case"
                          bars={Array.from({length: PLINKO_SLOTS}, (_, slot) => ({
                              label: String(slot + 1),
                              title: `Case ${slot + 1} (${slotGains(slot)}) · ${pct1(slotDrops(slot), plinkoDrops)} observé, ${String(PLINKO_ODDS[slot]).replace(".", ",")} % attendu`,
                              value: slotDrops(slot),
                              segments: [{key: "drops", label: "Billes", value: slotDrops(slot), color: GAMES.plinko!.color}],
                          }))}/>
                <details className="stats-table-toggle">
                    <summary>Comparer à la répartition attendue</summary>
                    <div className="stats-table-wrap">
                        <table className="stats-table">
                            <thead><tr><th>Case</th><th>Gains (prudent · équilibré · risqué)</th><th>Billes</th><th>Observé</th><th>Attendu</th><th>Crédits rendus</th></tr></thead>
                            <tbody>
                            {Array.from({length: PLINKO_SLOTS}, (_, slot) => (
                                <tr key={slot}>
                                    <td>{slot + 1}</td><td>{slotGains(slot)}</td><td>{fmt(slotDrops(slot))}</td>
                                    <td>{pct1(slotDrops(slot), plinkoDrops)}</td><td>{String(PLINKO_ODDS[slot]).replace(".", ",")} %</td>
                                    <td>{fmt(data.plinkoSlots.find(s => s.slot === slot)?.paid ?? 0)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </details>
            </section>}

            {/* ---------- Roulette */}
            {showRoulette && <>
            <section className="stats-section">
                <h2>Roulette : numéros sortis</h2>
                <p className="stats-note">
                    {fmt(draws)} tirages{rounds.firstDrawn && <> depuis le {dateTime(rounds.firstDrawn)}</>} (les tours sans mise
                    sont oubliés au bout de deux jours) · chaque numéro est attendu {pct1(1, 37)} du temps,
                    soit {draws ? (draws / 37).toFixed(1).replace(".", ",") : "–"} fois.
                </p>
                <BarChart ariaLabel="Nombre de sorties de chaque numéro de la roulette" labelEvery={2}
                          bars={data.rouletteNumbers.map((count, n) => ({
                              label: String(n), title: `Le ${n} · ${pct1(count, draws)} des tirages`, value: count,
                              segments: [{key: "draws", label: "Sorties", value: count, color: ROULETTE_COLORS[rouletteColor(n)]}],
                          }))}/>
            </section>

            <section className="stats-tiles">
                <Tile label="Rouge / noir" value={`${pct(red, draws)} / ${pct(black, draws)}`} detail={`attendu 48,6 % chacun · ${fmt(red)} rouges, ${fmt(black)} noirs`}/>
                <Tile label="Zéro" value={pct1(zero, draws)} detail={`${fmt(zero)} fois · attendu 2,7 %`}/>
                <Tile label="Pair / impair" value={`${pct(even, draws)} / ${pct(draws - even - zero, draws)}`} detail="hors zéro · attendu 48,6 % chacun"/>
                <Tile label="1-18 / 19-36" value={`${pct(low, draws)} / ${pct(draws - low - zero, draws)}`} detail="hors zéro · attendu 48,6 % chacun"/>
                <Tile label="Numéros chauds" value={hot.map(([n]) => n).join(" · ")} detail={hot.map(([, c]) => c).join(" · ") + " sorties"}/>
                <Tile label="Numéros froids" value={cold.map(([n]) => n).join(" · ")} detail={cold.map(([, c]) => c).join(" · ") + " sorties"}/>
            </section>

            <section className="stats-section stats-two">
                <div>
                    <h2>Roulette : types de mises</h2>
                    <div className="stats-table-wrap">
                        <table className="stats-table">
                            <thead><tr><th className="text">Mise</th><th>Jetons</th><th>Joueurs</th><th>Misé</th><th>Rendu</th><th>Retour</th></tr></thead>
                            <tbody>
                            {data.betKinds.map(k => (
                                <tr key={k.kind}>
                                    <td className="text">{BET_KINDS[k.kind] ?? k.kind}</td><td>{fmt(k.chips)}</td><td>{fmt(k.players)}</td>
                                    <td>{fmt(k.wagered)} <small>{pct(k.wagered, data.betKinds.reduce((s, x) => s + x.wagered, 0))}</small></td>
                                    <td>{fmt(k.paid)}</td><td>{pct1(k.paid, k.wagered)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div>
                    <h2>Roulette : numéros favoris</h2>
                    {data.favoriteNumbers.length === 0 ? <p className="stats-note">Personne n'a encore misé sur un numéro seul.</p> : (
                        <div className="stats-table-wrap">
                            <table className="stats-table">
                                <thead><tr><th className="text">Numéro</th><th>Jetons</th><th>Joueurs</th><th>Misé</th><th>Sorti</th></tr></thead>
                                <tbody>
                                {data.favoriteNumbers.map(f => (
                                    <tr key={f.number}>
                                        <td className="text"><i className="stats-dot" style={{background: ROULETTE_COLORS[rouletteColor(f.number)]}}/>{f.number}</td>
                                        <td>{fmt(f.chips)}</td><td>{fmt(f.players)}</td><td>{fmt(f.wagered)}</td>
                                        <td>{fmt(data.rouletteNumbers[f.number] ?? 0)} fois</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>
            </>}

            {/* ---------- Joueurs */}
            <section className="stats-section stats-two">
                <PlayersTable title="Plus gros gagnants" players={winners} empty="Personne n'est encore gagnant."/>
                <PlayersTable title="Plus gros perdants" players={losers} empty="Personne n'est encore perdant."/>
            </section>
            <section className="stats-section">
                <PlayersTable title="Joueurs les plus actifs" players={active} empty="Aucun joueur."/>
            </section>

            <section className="stats-section">
                <h2>Plus gros gains en une mise</h2>
                <div className="stats-table-wrap">
                    <table className="stats-table">
                        <thead><tr><th className="text">Joueur</th><th className="text">Jeu</th><th>Mise</th><th>Rendu</th><th>Gain net</th><th>Multiplié par</th><th className="text">Résultat</th><th>Quand</th></tr></thead>
                        <tbody>
                        {data.biggestWins.map((w, i) => (
                            <tr key={i}>
                                <td className="text">{w.username}</td>
                                <td className="text"><i className="stats-dot" style={{background: GAMES[w.game]?.color}}/>{gameName(w.game)}</td>
                                <td>{fmt(w.bet)}</td><td>{fmt(w.payout)}</td><td>{signed(w.payout - w.bet)}</td>
                                <td>×{(w.payout / w.bet).toFixed(1).replace(".", ",")}</td>
                                <td className="text">{w.game === "plinko" ? `case ${w.outcome + 1}` : `le ${w.outcome}`}</td>
                                <td>{dateTime(w.at)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </>
    );
}

function PlayersTable({title, players, empty}: { title: string; players: CasinoStatsData["players"]; empty: string }) {
    return (
        <div>
            <h2>{title}</h2>
            {players.length === 0 ? <p className="stats-note">{empty}</p> : (
                <div className="stats-table-wrap">
                    <table className="stats-table">
                        <thead><tr><th className="text">Joueur</th><th>Mises</th><th>Misé</th><th>Bilan</th><th>Retour</th><th>Crédits</th><th>Dernière mise</th></tr></thead>
                        <tbody>
                        {players.map(p => (
                            <tr key={p.username}>
                                <td className="text">{p.username}</td><td>{fmt(p.plays)}</td><td>{fmt(p.wagered)}</td>
                                <td className={p.net > 0 ? "stats-up" : p.net < 0 ? "stats-down" : ""}>{signed(p.net)}</td>
                                <td>{pct1(p.paid, p.wagered)}</td><td>{fmt(p.credits)}</td><td>{dateTime(p.last)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
