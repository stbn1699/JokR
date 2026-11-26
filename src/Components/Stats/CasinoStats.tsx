/**
 * Statistiques du hasard (console d'administration), une page par sujet (données partagées à filtre égal) :
 * - Aperçu : mises, crédits misés et rendus, bénéfice de la maison, taux de retour par jeu, activité, heures
 * - Plinko : mises choisies, cases atteintes (observé / attendu)
 * - Roulette : tours, numéros sortis, couleurs, types de mises, numéros favoris
 * - Joueurs : plus gros gagnants et perdants, plus actifs, plus gros gains en une mise
 * - Machines à sous, Blackjack, Keno, Poker : une page par jeu (chiffres, résultats des parties, mises, joueurs),
 *   plus les machines (machines à sous) et le résultat de chaque main (blackjack)
 * Filtres : période, et jeu sur l'aperçu et les joueurs (voir statsFilter.ts).
 */

import type {ReactNode} from "react";
import {statsService} from "../../Services/stats.service.ts";
import type {CasinoStatsData} from "../../Models/casinoStats.model.ts";
import {PLINKO_ODDS, PLINKO_RISKS, PLINKO_RTP, PLINKO_SLOTS, PLINKO_TABLES} from "../../../backend/src/utils/plinko.ts";
import {rouletteColor} from "../../../backend/src/utils/roulette.ts";
import {SLOT_MACHINES} from "../../../backend/src/utils/slots.ts";
import {POKER_PAYTABLE} from "../../../backend/src/utils/poker.ts";
import AdminPage, {StatsBody} from "../Admin/AdminPage.tsx";
import {filterKey, useAdminFilter} from "../Admin/useAdminFilter.ts";
import {useStatsData} from "../Admin/useStatsData.ts";
import BarChart from "./BarChart.tsx";
import {Legend, Tile} from "./StatsWidgets.tsx";
import {dateTime, fmt, longDay, pct, pct1, shortDay} from "./statsFormat.ts";
import {hasPeriod, type StatsFilter, timelineTitle} from "./statsFilter.ts";

const GAMES: Record<string, { name: string; color: string; rtp: number }> = {
    plinko: {name: "Plinko", color: "#3987e5", rtp: PLINKO_RTP},
    roulette: {name: "Roulette", color: "#e46f24", rtp: 36 / 37},
    slots: {name: "Machines à sous", color: "#1baf7a", rtp: 0.96},
    // en jouant parfaitement (voir backend/src/utils/blackjack.ts) ; en vrai un peu moins
    blackjack: {name: "Blackjack", color: "#a855f7", rtp: 0.995},
    keno: {name: "Keno", color: "#ec4899", rtp: 0.95},
    // en jouant parfaitement (voir backend/src/utils/poker.ts)
    poker: {name: "Poker", color: "#0ea5e9", rtp: 0.96},
};
// Jeux proposés dans le filtre
const CASINO_GAMES = Object.entries(GAMES).map(([code, g]) => ({code, name: g.name}));
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

// Page de statistiques du hasard. `game` : page d'un jeu qui lit les données de tous les jeux (Plinko, roulette) ;
// `only` : page d'un seul jeu (données filtrées sur ce jeu) ; sinon choix du jeu dans les filtres
function CasinoPage({title, description, game, only, children}: {
    title: string;
    description: string;
    game?: string;
    only?: string;
    children: (data: CasinoStatsData, filter: StatsFilter) => ReactNode;
}) {
    const [urlFilter] = useAdminFilter();
    const filter = only ? {...urlFilter, game: only} : game ? {...urlFilter, game: null} : urlFilter;
    const {data, error, loading, reload} = useStatsData(`casino?${filterKey(filter)}`, signal => statsService.casino(filter, signal));
    return (
        <AdminPage group="Hasard" title={title} description={description} filters={game || only ? null : CASINO_GAMES}
                   onRefresh={reload} refreshing={loading}
                   meta={data && <>Mis à jour le {dateTime(data.generatedAt)}
                       {data.overview.first && <> · données depuis le {dateTime(data.overview.first)}</>}</>}>
            <StatsBody data={data} error={error} label="Chargement des statistiques du hasard…">
                {d => d.overview.plays === 0
                    ? <p className="stats-status">{hasPeriod(filter) || filter.game ? "Aucune mise sur cette période." : "Personne n'a encore misé."}</p>
                    : children(d, filter)}
            </StatsBody>
        </AdminPage>
    );
}

// ---------------------------------------------------------------- Aperçu

export function CasinoOverview() {
    return (
        <CasinoPage title="Aperçu" description="Mises, crédits misés et rendus, bénéfice de la maison et taux de retour de chaque jeu.">
            {(data, filter) => {
                const o = data.overview;
                const house = o.wagered - o.paid;
                const best = data.biggestWins[0];
                return <>
                    <section className="stats-tiles">
                        <Tile label="Mises jouées" value={fmt(o.plays)} detail={`${fmt(o.plays1)} sur 24 h`}/>
                        <Tile label="Crédits misés" value={fmt(o.wagered)} detail={`${fmt(o.wagered1)} sur 24 h · ${fmt(o.wagered / o.plays)} par mise en moyenne`}/>
                        <Tile label="Crédits rendus" value={fmt(o.paid)} detail={`${pct1(o.paid, o.wagered)} des mises (taux de retour)`}/>
                        <Tile label="Bénéfice de la maison" value={signed(house)}
                              detail={`${pct1(house, o.wagered)} des mises · ${signed(o.wagered1 - o.paid1)} sur 24 h`}/>
                        <Tile label="Joueurs" value={fmt(o.players)} detail={`${fmt(o.players7)} ces 7 derniers jours`}/>
                        <Tile label="Mises gagnantes" value={pct(o.won, o.plays)}
                              detail={`${fmt(o.won)} ont rapporté plus que la mise · ${fmt(o.even)} remboursées tout juste`}/>
                        <Tile label="Plus gros gain" value={best ? signed(best.payout - best.bet) : "–"}
                              detail={best ? `${best.username} · ${gameName(best.game)} · ${fmt(best.bet)} misés` : "Pas encore de gain"}/>
                    </section>

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
                        <p className="stats-note stats-note-after">Le taux de retour observé se rapproche de l'attendu à mesure que les mises s'accumulent ; avec peu de mises, un gros gain le fait varier beaucoup.</p>
                    </section>

                    <section className="stats-two">
                        <div className="stats-section">
                            <h2>Crédits misés, {timelineTitle(filter)}</h2>
                            <Legend items={Object.values(GAMES).map(g => ({label: g.name, color: g.color}))}/>
                            <BarChart ariaLabel="Crédits misés par jour et par jeu" labelEvery={5}
                                      bars={data.timeline.map(t => ({
                                          label: shortDay(t.day), title: longDay(t.day), value: Math.round(t.wagered),
                                          segments: Object.entries(GAMES).map(([key, g]) => ({key, label: g.name, value: Math.round(t.byGame[key]?.wagered ?? 0), color: g.color})),
                                      }))}/>
                        </div>
                        <div className="stats-section">
                            <h2>Mises jouées, {timelineTitle(filter)}</h2>
                            <Legend items={Object.values(GAMES).map(g => ({label: g.name, color: g.color}))}/>
                            <BarChart ariaLabel="Mises jouées par jour et par jeu" labelEvery={5}
                                      bars={data.timeline.map(t => ({
                                          label: shortDay(t.day), title: longDay(t.day), value: t.plays,
                                          segments: Object.entries(GAMES).map(([key, g]) => ({key, label: g.name, value: t.byGame[key]?.plays ?? 0, color: g.color})),
                                      }))}/>
                        </div>
                    </section>

                    <section className="stats-two stats-two-wide">
                        <div className="stats-section">
                            <h2>Heure des mises</h2>
                            <BarChart ariaLabel="Mises jouées par heure de la journée (heure française)" labelEvery={3}
                                      bars={data.hours.map(h => ({label: `${h.hour}h`, title: `${h.hour}h – ${h.hour + 1}h · ${fmt(h.wagered)} crédits misés`, value: h.plays}))}/>
                        </div>
                        <div className="stats-section">
                            <h2>Bilan jour par jour</h2>
                            <div className="stats-table-wrap stats-table-tall">
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
                        </div>
                    </section>
                </>;
            }}
        </CasinoPage>
    );
}

// ---------------------------------------------------------------- Plinko

export function CasinoPlinko() {
    return (
        <CasinoPage game="plinko" title="Plinko" description="Mises choisies et cases atteintes, comparées à la répartition attendue.">
            {data => {
                const drops = data.plinkoSlots.reduce((sum, s) => sum + s.drops, 0);
                const slotDrops = (slot: number) => data.plinkoSlots.find(s => s.slot === slot)?.drops ?? 0;
                const plinko = data.games.find(g => g.game === "plinko");
                const color = GAMES.plinko!.color;
                return <>
                    <section className="stats-tiles">
                        <Tile label="Billes lâchées" value={fmt(drops)} detail={plinko ? `${fmt(plinko.plays7)} ces 7 derniers jours` : "–"}/>
                        <Tile label="Joueurs" value={plinko ? fmt(plinko.players) : "–"} detail="ont lâché au moins une bille"/>
                        <Tile label="Retour observé" value={plinko ? pct1(plinko.paid, plinko.wagered) : "–"} detail={`attendu ${pct1(PLINKO_RTP, 1)}`}/>
                        <Tile label="Cases du bord" value={pct1(slotDrops(0) + slotDrops(PLINKO_SLOTS - 1), drops)} detail="des billes, les plus gros gains"/>
                    </section>

                    <section className="stats-two stats-two-wide">
                        <div className="stats-section">
                            <h2>Mises choisies</h2>
                            <BarChart ariaLabel="Billes de Plinko par mise" color={color}
                                      bars={data.plinkoBets.map(b => ({label: String(b.bet), title: `Mise de ${b.bet} · ${b.players} joueur(s)`, value: b.drops}))}/>
                        </div>
                        <div className="stats-section">
                            <h2>Cases atteintes</h2>
                            <BarChart ariaLabel="Billes de Plinko par case"
                                      bars={Array.from({length: PLINKO_SLOTS}, (_, slot) => ({
                                          label: String(slot + 1),
                                          title: `Case ${slot + 1} (${slotGains(slot)}) · ${pct1(slotDrops(slot), drops)} observé, ${String(PLINKO_ODDS[slot]).replace(".", ",")} % attendu`,
                                          value: slotDrops(slot),
                                          segments: [{key: "drops", label: "Billes", value: slotDrops(slot), color}],
                                      }))}/>
                        </div>
                    </section>

                    <section className="stats-section">
                        <h2>Répartition observée et attendue</h2>
                        <div className="stats-table-wrap">
                            <table className="stats-table">
                                <thead><tr><th>Case</th><th>Gains (prudent · équilibré · risqué)</th><th>Billes</th><th>Observé</th><th>Attendu</th><th>Crédits rendus</th></tr></thead>
                                <tbody>
                                {Array.from({length: PLINKO_SLOTS}, (_, slot) => (
                                    <tr key={slot}>
                                        <td>{slot + 1}</td><td>{slotGains(slot)}</td><td>{fmt(slotDrops(slot))}</td>
                                        <td>{pct1(slotDrops(slot), drops)}</td><td>{String(PLINKO_ODDS[slot]).replace(".", ",")} %</td>
                                        <td>{fmt(data.plinkoSlots.find(s => s.slot === slot)?.paid ?? 0)}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>;
            }}
        </CasinoPage>
    );
}

// ---------------------------------------------------------------- Roulette

export function CasinoRoulette() {
    return (
        <CasinoPage game="roulette" title="Roulette" description="Tours, numéros sortis, types de mises et numéros favoris.">
            {data => {
                const rounds = data.rouletteRounds;
                const draws = data.rouletteNumbers.reduce((a, b) => a + b, 0);
                const drawsWhere = (test: (n: number) => boolean) => data.rouletteNumbers.reduce((sum, c, n) => sum + (test(n) ? c : 0), 0);
                const red = drawsWhere(n => rouletteColor(n) === "red");
                const black = drawsWhere(n => rouletteColor(n) === "black");
                const zero = data.rouletteNumbers[0] ?? 0;
                const even = drawsWhere(n => n !== 0 && n % 2 === 0);
                const low = drawsWhere(n => n >= 1 && n <= 18);
                const hot = [...data.rouletteNumbers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
                const cold = [...data.rouletteNumbers.entries()].sort((a, b) => a[1] - b[1]).slice(0, 5);
                const kindsTotal = data.betKinds.reduce((s, x) => s + x.wagered, 0);
                return <>
                    <h2 className="admin-subhead">Tours</h2>
                    <section className="stats-tiles">
                        <Tile label="Tours de roulette" value={fmt(rounds.drawn)}
                              detail={`${fmt(rounds.withBets)} avec des mises · ${pct(rounds.withBets, rounds.drawn)} des tours`}/>
                        <Tile label="Joueurs par tour" value={rounds.withBets ? (rounds.seats / rounds.withBets).toFixed(1).replace(".", ",") : "–"}
                              detail={`tours avec des mises · ${rounds.maxPlayers} au plus sur un tour`}/>
                        <Tile label="Plus gros pot" value={fmt(rounds.biggestPot)}
                              detail={`crédits sur un seul tour · ${rounds.withBets ? fmt(rounds.wagered / rounds.withBets) : "–"} par tour en moyenne`}/>
                        <Tile label="Jetons posés" value={fmt(rounds.chips)}
                              detail={`sur le tapis · ${rounds.withBets ? (rounds.chips / Math.max(1, rounds.seats)).toFixed(1).replace(".", ",") : "–"} par joueur et par tour`}/>
                    </section>

                    <section className="stats-section">
                        <h2>Numéros sortis</h2>
                        <p className="stats-note">
                            {fmt(draws)} tirages{rounds.firstDrawn && <> depuis le {dateTime(rounds.firstDrawn)}</>} (les tours sans mise
                            sont oubliés au bout de deux jours) · chaque numéro est attendu {pct1(1, 37)} du temps,
                            soit {draws ? (draws / 37).toFixed(1).replace(".", ",") : "–"} fois.
                        </p>
                        <BarChart ariaLabel="Nombre de sorties de chaque numéro de la roulette"
                                  bars={data.rouletteNumbers.map((count, n) => ({
                                      label: String(n), title: `Le ${n} · ${pct1(count, draws)} des tirages`, value: count,
                                      segments: [{key: "draws", label: "Sorties", value: count, color: ROULETTE_COLORS[rouletteColor(n)]}],
                                  }))}/>
                    </section>

                    <h2 className="admin-subhead">Chances simples</h2>
                    <section className="stats-tiles">
                        <Tile label="Rouge / noir" value={`${pct(red, draws)} / ${pct(black, draws)}`} detail={`attendu 48,6 % chacun · ${fmt(red)} rouges, ${fmt(black)} noirs`}/>
                        <Tile label="Zéro" value={pct1(zero, draws)} detail={`${fmt(zero)} fois · attendu 2,7 %`}/>
                        <Tile label="Pair / impair" value={`${pct(even, draws)} / ${pct(draws - even - zero, draws)}`} detail="hors zéro · attendu 48,6 % chacun"/>
                        <Tile label="1-18 / 19-36" value={`${pct(low, draws)} / ${pct(draws - low - zero, draws)}`} detail="hors zéro · attendu 48,6 % chacun"/>
                        <Tile label="Numéros chauds" value={hot.map(([n]) => n).join(" · ")} detail={hot.map(([, c]) => c).join(" · ") + " sorties"}/>
                        <Tile label="Numéros froids" value={cold.map(([n]) => n).join(" · ")} detail={cold.map(([, c]) => c).join(" · ") + " sorties"}/>
                    </section>

                    <section className="stats-two">
                        <div className="stats-section">
                            <h2>Types de mises</h2>
                            <div className="stats-table-wrap">
                                <table className="stats-table">
                                    <thead><tr><th className="text">Mise</th><th>Jetons</th><th>Joueurs</th><th>Misé</th><th>Rendu</th><th>Retour</th></tr></thead>
                                    <tbody>
                                    {data.betKinds.map(k => (
                                        <tr key={k.kind}>
                                            <td className="text">{BET_KINDS[k.kind] ?? k.kind}</td><td>{fmt(k.chips)}</td><td>{fmt(k.players)}</td>
                                            <td>{fmt(k.wagered)} <small>{pct(k.wagered, kindsTotal)}</small></td>
                                            <td>{fmt(k.paid)}</td><td>{pct1(k.paid, k.wagered)}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="stats-section">
                            <h2>Numéros favoris</h2>
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
                </>;
            }}
        </CasinoPage>
    );
}

// ---------------------------------------------------------------- Joueurs

export function CasinoPlayers() {
    return (
        <CasinoPage title="Joueurs" description="Gagnants, perdants, joueurs les plus actifs et plus gros gains en une mise.">
            {data => {
                const winners = [...data.players].filter(p => p.net > 0).sort((a, b) => b.net - a.net).slice(0, 10);
                const losers = [...data.players].filter(p => p.net < 0).sort((a, b) => a.net - b.net).slice(0, 10);
                const active = data.players.slice(0, 10);
                return <>
                    <section className="stats-two">
                        <PlayersTable title="Plus gros gagnants" players={winners} empty="Personne n'est encore gagnant."/>
                        <PlayersTable title="Plus gros perdants" players={losers} empty="Personne n'est encore perdant."/>
                    </section>
                    <section className="stats-two">
                        <PlayersTable title="Joueurs les plus actifs" players={active} empty="Aucun joueur."/>
                        <div className="stats-section">
                            <h2>Plus gros gains en une mise</h2>
                            <div className="stats-table-wrap">
                                <table className="stats-table">
                                    <thead><tr><th className="text">Joueur</th><th className="text">Jeu</th><th>Mise</th><th>Gain net</th><th>Multiplié par</th><th className="text">Résultat</th><th>Quand</th></tr></thead>
                                    <tbody>
                                    {data.biggestWins.map((w, i) => (
                                        <tr key={i}>
                                            <td className="text">{w.username}</td>
                                            <td className="text"><i className="stats-dot" style={{background: GAMES[w.game]?.color}}/>{gameName(w.game)}</td>
                                            <td>{fmt(w.bet)}</td><td>{signed(w.payout - w.bet)}</td>
                                            <td>×{(w.payout / w.bet).toFixed(1).replace(".", ",")}</td>
                                            <td className="text">{w.game === "plinko" ? `case ${w.outcome + 1}` : `le ${w.outcome}`}</td>
                                            <td>{dateTime(w.at)}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                </>;
            }}
        </CasinoPage>
    );
}

function PlayersTable({title, players, empty}: { title: string; players: CasinoStatsData["players"]; empty: string }) {
    return (
        <div className="stats-section">
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

// ---------------------------------------------------------------- Une page par jeu (machines à sous, blackjack, keno, poker)

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

// Résultat d'une partie (colonne outcome) selon le jeu
const OUTCOME: Record<string, { title: string; label: (n: number) => string }> = {
    slots: {title: "Lignes gagnantes", label: n => (n === 0 ? "Aucune ligne" : plural(n, "ligne"))},
    keno: {title: "Numéros trouvés", label: n => plural(n, "numéro")},
    blackjack: {title: "Mains jouées par partie", label: n => (n === 1 ? "1 main" : `${n} mains (séparées)`)},
    poker: {title: "Combinaisons", label: n => POKER_PAYTABLE[n]?.name ?? "Rien"},
};

const BLACKJACK_OUTCOMES: Record<string, string> = {blackjack: "Blackjack", win: "Gagnée", push: "Égalité", lose: "Perdue", bust: "Sautée (plus de 21)"};
const BLACKJACK_ORDER = ["blackjack", "win", "push", "lose", "bust"];

function CasinoGamePage({game, description, children}: {
    game: string;
    description: string;
    children?: (data: CasinoStatsData) => ReactNode;
}) {
    const info = GAMES[game]!;
    return (
        <CasinoPage only={game} title={info.name} description={description}>
            {(data, filter) => {
                const g = data.games.find(x => x.game === game);
                if (!g) return <p className="stats-status">Aucune partie sur cette période.</p>;
                const outcome = OUTCOME[game]!;
                const outcomes = data.outcomes.filter(o => o.game === game);
                const bets = data.betSizes.filter(b => b.game === game);
                const best = [...data.players].sort((a, b) => b.net - a.net).slice(0, 10);
                return <>
                    <section className="stats-tiles">
                        <Tile label="Parties" value={fmt(g.plays)} detail={`${fmt(g.plays7)} ces 7 derniers jours`}/>
                        <Tile label="Joueurs" value={fmt(g.players)} detail={`mise moyenne ${fmt(g.avgBet)}`}/>
                        <Tile label="Crédits misés" value={fmt(g.wagered)} detail={`${fmt(g.paid)} rendus`}/>
                        <Tile label="Bénéfice de la maison" value={signed(g.wagered - g.paid)} detail={`${pct1(g.wagered - g.paid, g.wagered)} des mises`}/>
                        <Tile label="Taux de retour" value={pct1(g.paid, g.wagered)} detail={`attendu ${pct1(info.rtp, 1)}`}/>
                        <Tile label="Parties gagnantes" value={pct(g.won, g.plays)} detail={`plus gros gain ${signed(g.bestNet)}`}/>
                    </section>

                    {children?.(data)}

                    <section className="stats-two">
                        <div className="stats-section">
                            <h2>{outcome.title}</h2>
                            <BarChart ariaLabel={outcome.title} color={info.color}
                                      bars={outcomes.map(o => ({label: outcome.label(o.outcome), title: `${pct1(o.plays, g.plays)} des parties`, value: o.plays}))}/>
                            <div className="stats-table-wrap">
                                <table className="stats-table">
                                    <thead><tr><th className="text">Résultat</th><th>Parties</th><th>Part</th><th>Misé</th><th>Rendu</th><th>Retour</th></tr></thead>
                                    <tbody>
                                    {outcomes.map(o => (
                                        <tr key={o.outcome}>
                                            <td className="text">{outcome.label(o.outcome)}</td><td>{fmt(o.plays)}</td><td>{pct1(o.plays, g.plays)}</td>
                                            <td>{fmt(o.wagered)}</td><td>{fmt(o.paid)}</td><td>{pct1(o.paid, o.wagered)}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="stats-section">
                            <h2>Mises choisies</h2>
                            <BarChart ariaLabel="Parties par mise" color={info.color}
                                      bars={bets.map(b => ({label: String(b.bet), title: `Mise de ${b.bet} · ${plural(b.players, "joueur")}`, value: b.plays}))}/>
                            <h2 className="stats-subtitle">Parties, {timelineTitle(filter)}</h2>
                            <BarChart ariaLabel="Parties par jour" color={info.color} labelEvery={5}
                                      bars={data.timeline.map(t => ({label: shortDay(t.day), title: longDay(t.day), value: t.byGame[game]?.plays ?? 0}))}/>
                        </div>
                    </section>

                    <section className="stats-two">
                        <PlayersTable title="Meilleurs bilans" players={best} empty="Aucun joueur."/>
                        <div className="stats-section">
                            <h2>Plus gros gains en une partie</h2>
                            {data.biggestWins.length === 0 ? <p className="stats-note">Pas encore de gain.</p> : (
                                <div className="stats-table-wrap">
                                    <table className="stats-table">
                                        <thead><tr><th className="text">Joueur</th><th>Mise</th><th>Gain net</th><th>Multiplié par</th><th className="text">Résultat</th><th>Quand</th></tr></thead>
                                        <tbody>
                                        {data.biggestWins.map((w, i) => (
                                            <tr key={i}>
                                                <td className="text">{w.username}</td><td>{fmt(w.bet)}</td><td>{signed(w.payout - w.bet)}</td>
                                                <td>×{(w.payout / w.bet).toFixed(1).replace(".", ",")}</td>
                                                <td className="text">{outcome.label(w.outcome)}</td><td>{dateTime(w.at)}</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </section>
                </>;
            }}
        </CasinoPage>
    );
}

export function CasinoSlots() {
    return (
        <CasinoGamePage game="slots" description="Chaque machine, le nombre de lignes jouées, les lignes gagnantes et les mises.">
            {data => (
                <section className="stats-section">
                    <h2>Par machine et nombre de lignes</h2>
                    <div className="stats-table-wrap">
                        <table className="stats-table">
                            <thead><tr><th className="text">Machine</th><th>Lignes</th><th>Parties</th><th>Joueurs</th><th>Misé</th><th>Rendu</th><th>Retour</th><th>Parties gagnantes</th></tr></thead>
                            <tbody>
                            {data.slotMachines.map(m => (
                                <tr key={`${m.machine}-${m.lines}`}>
                                    {/* 0 ligne : parties enregistrées dans un ancien format, machine et lignes inconnues */}
                                    {m.lines === 0 ? <><td className="text"><small>Ancien format (machine inconnue)</small></td><td>–</td></>
                                        : <><td className="text">{SLOT_MACHINES[m.machine]?.name ?? `Machine ${m.machine + 1}`}</td><td>{m.lines}</td></>}
                                    <td>{fmt(m.plays)}</td><td>{fmt(m.players)}</td><td>{fmt(m.wagered)}</td><td>{fmt(m.paid)}</td>
                                    <td>{pct1(m.paid, m.wagered)}</td><td>{pct(m.won, m.plays)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </CasinoGamePage>
    );
}

export function CasinoBlackjack() {
    return (
        <CasinoGamePage game="blackjack" description="Résultat de chaque main, mains doublées et séparées, mises et joueurs.">
            {data => {
                const hands = BLACKJACK_ORDER.flatMap(o => data.blackjackHands.filter(h => h.outcome === o));
                const total = hands.reduce((sum, h) => sum + h.hands, 0);
                return (
                    <section className="stats-two stats-two-wide">
                        <div className="stats-section">
                            <h2>Mains</h2>
                            <BarChart ariaLabel="Mains de blackjack par résultat" color={GAMES.blackjack!.color}
                                      bars={hands.map(h => ({label: BLACKJACK_OUTCOMES[h.outcome] ?? h.outcome, title: pct1(h.hands, total), value: h.hands}))}/>
                        </div>
                        <div className="stats-section">
                            <h2>Résultat main par main</h2>
                            <div className="stats-table-wrap">
                                <table className="stats-table">
                                    <thead><tr><th className="text">Résultat</th><th>Mains</th><th>Part</th><th>Doublées</th><th>Séparées</th><th>Misé</th><th>Rendu</th></tr></thead>
                                    <tbody>
                                    {hands.map(h => (
                                        <tr key={h.outcome}>
                                            <td className="text">{BLACKJACK_OUTCOMES[h.outcome] ?? h.outcome}</td><td>{fmt(h.hands)}</td>
                                            <td>{pct1(h.hands, total)}</td><td>{fmt(h.doubled)}</td><td>{fmt(h.split)}</td>
                                            <td>{fmt(h.wagered)}</td><td>{fmt(h.paid)}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                );
            }}
        </CasinoGamePage>
    );
}

export function CasinoKeno() {
    return <CasinoGamePage game="keno" description="Numéros trouvés à chaque tirage, mises et joueurs."/>;
}

export function CasinoPoker() {
    return <CasinoGamePage game="poker" description="Combinaisons obtenues (de la quinte flush royale à rien), mises et joueurs."/>;
}
