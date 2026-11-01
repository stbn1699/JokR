/**
 * Page "Défis précédents" (/defi) : les défis des 30 derniers jours.
 * Pour chaque jour : rejouer la grille (partie normale, hors classement), voir le classement du jour,
 * et le résultat du joueur s'il l'avait réussi ce jour-là.
 */

import "./DailyHistory.scss";
import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {dailyService, formatDailyDate} from "../../Services/daily.service.ts";
import {formatDuration} from "../../Services/format.ts";
import type {DailyHistoryDay} from "../../Models/daily.model.ts";
import {useAuth} from "../../Context/authContext.ts";
import {useDailyRefresh} from "../PuzzleUI/useDailyRefresh.ts";
import {DAILY_GAME_NAMES, dailyGridLabel} from "../../Services/dailyGames.ts";

export default function DailyHistory() {
    const {userId, isLoggedIn} = useAuth();
    const [days, setDays] = useState<DailyHistoryDay[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    // À minuit, le défi de la veille rejoint l'historique : la page se recharge
    const [nextInMs, setNextInMs] = useState<number | undefined>(undefined);
    const dayTick = useDailyRefresh(nextInMs);

    useEffect(() => {
        const controller = new AbortController();
        dailyService.overview(controller.signal)
            .then(o => setNextInMs(o.nextInMs))
            .catch(() => undefined);
        dailyService.history(controller.signal)
            .then(setDays)
            .catch((err: Error) => {
                if (err.name !== "AbortError") setError(err.message || "Impossible de charger les défis précédents.");
            });
        return () => controller.abort();
    }, [userId, dayTick]);

    return (
        <main className="daily-history">
            <section className="daily-history-card">
                <h1>Défis précédents</h1>
                <p className="daily-history-intro">
                    Rejoue les grilles des jours passés. Une grille rejouée compte comme une partie normale
                    (XP habituelle), mais n'entre pas dans le classement de son jour.
                </p>
                <Link to="/" className="daily-history-today">← Défi d'aujourd'hui</Link>
                {!isLoggedIn && (
                    <p className="daily-history-login">
                        <Link to="/register" state={{from: "/defi"}}>Crée un compte</Link> ou{" "}
                        <Link to="/login" state={{from: "/defi"}}>connecte-toi</Link> pour rejouer les défis.
                    </p>
                )}

                {error && <p className="daily-history-error" role="alert">{error}</p>}
                {!error && !days && <p className="daily-history-status">Chargement…</p>}
                {days?.length === 0 && <p className="daily-history-status">Pas encore de défi passé : reviens demain !</p>}

                {days?.map(day => (
                    <article key={day.date} className="daily-history-day">
                        <h2>{formatDailyDate(day.date)}</h2>
                        <div className="daily-history-games">
                            {day.games.map(game => (
                                <div key={game.code} className="daily-history-game">
                                    <div className="daily-history-game-head">
                                        <strong>{DAILY_GAME_NAMES[game.code] ?? game.code}</strong>
                                        <span>{dailyGridLabel(game.code, game.size, game.emptyCells)}</span>
                                    </div>
                                    <p className="daily-history-result">
                                        {game.result
                                            ? <>✓ {formatDuration(game.result.durationMs)} · {game.result.rank}<sup>{game.result.rank === 1 ? "er" : "e"}</sup> / {game.result.total}</>
                                            : <>{game.players} joueur{game.players > 1 ? "s" : ""} classé{game.players > 1 ? "s" : ""}</>}
                                    </p>
                                    <div className="daily-history-actions">
                                        {isLoggedIn && <Link to={`/defi/${game.code}/${day.date}`} className="replay">Rejouer</Link>}
                                        <Link to={`/classements?onglet=defi&jeu=${game.code.toLowerCase()}&date=${day.date}`}>
                                            Classement
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </article>
                ))}
            </section>
        </main>
    );
}
