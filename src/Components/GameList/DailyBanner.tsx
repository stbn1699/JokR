import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import "./DailyBanner.scss";
import {dailyService, formatDailyDate} from "../../Services/daily.service.ts";
import {formatDuration} from "../../Services/format.ts";
import type {DailyOverview} from "../../Models/daily.model.ts";
import {useAuth} from "../../Context/authContext.ts";

const GAME_NAMES: Record<string, string> = {SUDOKU: "Sudoku", BINERO: "Binero"};

/**
 * Bandeau "Défi du jour" de l'accueil : une grille par jeu, la même pour tout le monde.
 * Une fois réussi, le bouton affiche le temps et la place du joueur.
 */
export default function DailyBanner() {
    const {userId} = useAuth();
    const [overview, setOverview] = useState<DailyOverview | null>(null);

    // Rechargé à la connexion / déconnexion (les résultats dépendent du joueur)
    useEffect(() => {
        const controller = new AbortController();
        dailyService.overview(controller.signal)
            .then(setOverview)
            .catch(() => setOverview(null));
        return () => controller.abort();
    }, [userId]);

    if (!overview) return null;

    return (
        <section className="daily-banner" aria-labelledby="daily-banner-title">
            <div className="daily-banner-header">
                <h2 id="daily-banner-title">Défi du jour</h2>
                <span className="daily-banner-date">{formatDailyDate(overview.date)}</span>
            </div>
            <p className="daily-banner-text">
                La même grille pour tout le monde. Une seule tentative comptée par jour : sois le plus rapide !
            </p>

            <div className="daily-banner-games">
                {overview.games.map(game => (
                    <Link key={game.code} to={`/defi/${game.code}`}
                          className={`daily-banner-game ${game.result ? "done" : ""}`}>
                        <span className="daily-banner-game-name">{GAME_NAMES[game.code] ?? game.code}</span>
                        <span className="daily-banner-game-info">
                            {game.result
                                ? <>✓ {formatDuration(game.result.durationMs)} · {game.result.rank}<sup>{game.result.rank === 1 ? "er" : "e"}</sup> / {game.result.total}</>
                                : <>{game.size}×{game.size} · {game.emptyCells} cases</>}
                        </span>
                    </Link>
                ))}
            </div>

            <Link to="/classements?onglet=defi" className="daily-banner-link">Voir le classement du jour →</Link>
        </section>
    );
}
