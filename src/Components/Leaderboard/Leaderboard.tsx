/**
 * Page Classements : XP globale, par jeu, et défi du jour.
 * L'onglet est dans l'adresse (?onglet=xp|sudoku|binero|rikudo|defi&jeu=sudoku|binero[&date=AAAA-MM-JJ])
 * pour pouvoir y renvoyer (date = classement d'un défi passé).
 */

import "./Leaderboard.scss";
import {useEffect, useState} from "react";
import {useSearchParams} from "react-router-dom";
import {useAuth} from "../../Context/authContext.ts";
import {type Leaderboard as Board, leaderboardService} from "../../Services/leaderboard.service.ts";
import {dailyService, formatDailyDate} from "../../Services/daily.service.ts";
import {formatDuration} from "../../Services/format.ts";
import type {DailyLeaderboard} from "../../Models/daily.model.ts";

const TABS = [
    {id: "xp", label: "XP globale"},
    {id: "sudoku", label: "Sudoku"},
    {id: "binero", label: "Binero"},
    {id: "rikudo", label: "Rikudo"},
    {id: "defi", label: "Défi du jour"},
] as const;
type Tab = typeof TABS[number]["id"];

const DAILY_GAMES = [{id: "sudoku", label: "Sudoku"}, {id: "binero", label: "Binero"}] as const;

const ordinal = (rank: number) => <>{rank}<sup>{rank === 1 ? "er" : "e"}</sup></>;

export default function Leaderboard() {
    const {username} = useAuth();
    const [params, setParams] = useSearchParams();
    const tab: Tab = TABS.some(t => t.id === params.get("onglet")) ? params.get("onglet") as Tab : "xp";
    const dailyGame = params.get("jeu") === "binero" ? "binero" : "sudoku";
    const dailyDateParam = params.get("date") ?? undefined;

    const [board, setBoard] = useState<Board | null>(null);
    const [daily, setDaily] = useState<DailyLeaderboard | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        const request = tab === "defi"
            ? dailyService.leaderboard(dailyGame, controller.signal, dailyDateParam).then(d => {
                setDaily(d);
                setBoard(null);
            })
            : (tab === "xp" ? leaderboardService.xp(controller.signal) : leaderboardService.game(tab, controller.signal))
                .then(b => {
                    setBoard(b);
                    setDaily(null);
                });
        request
            .then(() => setError(null))
            .catch((err: Error) => {
                if (err.name !== "AbortError") setError(err.message || "Impossible de charger le classement.");
            })
            .finally(() => setLoading(false));
        return () => controller.abort();
    }, [tab, dailyGame, dailyDateParam]);

    const select = (next: Record<string, string>) => {
        setLoading(true);
        setParams(next, {replace: true});
    };

    const isMe = (name: string) => username !== null && name === username;

    return (
        <main className="leaderboard">
            <section className="leaderboard-card">
                <h1>Classements</h1>

                <div className="leaderboard-tabs" role="tablist">
                    {TABS.map(t => (
                        <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
                                className={tab === t.id ? "selected" : ""} onClick={() => select({onglet: t.id})}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {tab === "defi" && (
                    <div className="leaderboard-subtabs">
                        {DAILY_GAMES.map(g => (
                            <button key={g.id} type="button" className={dailyGame === g.id ? "selected" : ""}
                                    onClick={() => select({onglet: "defi", jeu: g.id, ...(dailyDateParam ? {date: dailyDateParam} : {})})}>
                                {g.label}
                            </button>
                        ))}
                        {daily && <span className="leaderboard-date">{formatDailyDate(daily.date)}</span>}
                        {dailyDateParam && (
                            <button type="button" onClick={() => select({onglet: "defi", jeu: dailyGame})}>
                                Aujourd'hui
                            </button>
                        )}
                    </div>
                )}

                {error && <p className="leaderboard-error" role="alert">{error}</p>}
                {loading && !error && <p className="leaderboard-status">Chargement…</p>}

                {!loading && !error && board && (
                    board.entries.length === 0
                        ? <p className="leaderboard-status">Personne n'est encore classé.</p>
                        : (
                            <table className="leaderboard-table">
                                <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Joueur</th>
                                    <th>Niveau</th>
                                    <th>XP</th>
                                    {tab !== "xp" && <th>Victoires</th>}
                                </tr>
                                </thead>
                                <tbody>
                                {board.entries.map(e => (
                                    <tr key={e.username} className={isMe(e.username) ? "me" : ""}>
                                        <td>{ordinal(e.rank)}</td>
                                        <td>{e.username}</td>
                                        <td>{e.level}</td>
                                        <td>{e.xp}</td>
                                        {tab !== "xp" && <td>{e.gamesWon}</td>}
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        )
                )}

                {!loading && !error && daily && (
                    daily.entries.length === 0
                        ? <p className="leaderboard-status">Personne n'a encore réussi le défi aujourd'hui. À toi de jouer !</p>
                        : (
                            <table className="leaderboard-table">
                                <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Joueur</th>
                                    <th>Temps</th>
                                </tr>
                                </thead>
                                <tbody>
                                {daily.entries.map(e => (
                                    <tr key={e.username} className={isMe(e.username) ? "me" : ""}>
                                        <td>{ordinal(e.rank)}</td>
                                        <td>{e.username}</td>
                                        <td>{formatDuration(e.durationMs)}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        )
                )}

                {/* Place du joueur connecté, utile quand il n'est pas dans le top 20 */}
                {!loading && board?.me && (
                    <p className="leaderboard-me">Ta place : {ordinal(board.me.rank)} sur {board.me.total}</p>
                )}
                {!loading && daily?.me && (
                    <p className="leaderboard-me">
                        Ta place : {ordinal(daily.me.rank)} sur {daily.me.total} ({formatDuration(daily.me.durationMs)})
                    </p>
                )}
            </section>
        </main>
    );
}
