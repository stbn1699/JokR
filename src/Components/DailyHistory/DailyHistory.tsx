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

const GAME_NAMES: Record<string, string> = {SUDOKU: "Sudoku", BINERO: "Binero"};

export default function DailyHistory() {
    const {userId} = useAuth();
    const [days, setDays] = useState<DailyHistoryDay[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        dailyService.history(controller.signal)
            .then(setDays)
            .catch((err: Error) => {
                if (err.name !== "AbortError") setError(err.message || "Impossible de charger les défis précédents.");
            });
        return () => controller.abort();
    }, [userId]);

    return (
        <main className="daily-history">
            <section className="daily-history-card">
                <h1>Défis précédents</h1>
                <p className="daily-history-intro">
                    Rejoue les grilles des jours passés. Une grille rejouée compte comme une partie normale
                    (XP habituelle), mais n'entre pas dans le classement de son jour.
                </p>
                <Link to="/" className="daily-history-today">← Défi d'aujourd'hui</Link>

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
                                        <strong>{GAME_NAMES[game.code] ?? game.code}</strong>
                                        <span>{game.size}×{game.size} · {game.emptyCells} cases</span>
                                    </div>
                                    <p className="daily-history-result">
                                        {game.result
                                            ? <>✓ {formatDuration(game.result.durationMs)} · {game.result.rank}<sup>{game.result.rank === 1 ? "er" : "e"}</sup> / {game.result.total}</>
                                            : <>{game.players} joueur{game.players > 1 ? "s" : ""} classé{game.players > 1 ? "s" : ""}</>}
                                    </p>
                                    <div className="daily-history-actions">
                                        <Link to={`/defi/${game.code}/${day.date}`} className="replay">Rejouer</Link>
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
