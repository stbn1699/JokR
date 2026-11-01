import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import "./DailyBanner.scss";
import {dailyService, formatDailyDate} from "../../Services/daily.service.ts";
import {formatDuration} from "../../Services/format.ts";
import type {DailyOverview} from "../../Models/daily.model.ts";
import {useAuth} from "../../Context/authContext.ts";
import {useDailyRefresh} from "../PuzzleUI/useDailyRefresh.ts";
import {FaLock} from "react-icons/fa";
import {DAILY_GAME_NAMES, dailyGridLabel} from "../../Services/dailyGames.ts";

/**
 * Bandeau "Défi du jour" de l'accueil : une grille par jeu, la même pour tout le monde.
 * Une fois réussi, le bouton affiche le temps et la place du joueur.
 * À minuit, le bandeau se recharge tout seul avec les défis du nouveau jour.
 */
export default function DailyBanner() {
    const {userId, isLoggedIn} = useAuth();
    const [overview, setOverview] = useState<DailyOverview | null>(null);
    const dayTick = useDailyRefresh(overview?.nextInMs, overview ? !overview.ready : false);

    // Rechargé à la connexion / déconnexion (les résultats dépendent du joueur) et au changement de jour
    useEffect(() => {
        const controller = new AbortController();
        dailyService.overview(controller.signal)
            .then(setOverview)
            .catch(() => setOverview(null));
        return () => controller.abort();
    }, [userId, dayTick]);

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
                {overview.games.map(game => {
                    const content = (
                        <>
                            <span className="daily-banner-game-name">{DAILY_GAME_NAMES[game.code] ?? game.code}</span>
                            <span className="daily-banner-game-info">
                                {game.result
                                    ? <>✓ {formatDuration(game.result.durationMs)} · {game.result.rank}<sup>{game.result.rank === 1 ? "er" : "e"}</sup> / {game.result.total}</>
                                    : dailyGridLabel(game.code, game.size, game.emptyCells)}
                            </span>
                        </>
                    );
                    // Invité : grilles visibles mais verrouillées
                    return isLoggedIn
                        ? <Link key={game.code} to={`/defi/${game.code}`}
                                className={`daily-banner-game ${game.result ? "done" : ""}`}>{content}</Link>
                        : <div key={game.code} className="daily-banner-game locked" aria-disabled>
                            <FaLock className="daily-banner-lock" aria-hidden/>{content}
                        </div>;
                })}
            </div>

            {!isLoggedIn && (
                <div className="daily-banner-login">
                    <p>Crée un compte pour jouer aux défis du jour et entrer dans le classement !</p>
                    <div className="daily-banner-login-buttons">
                        <Link to="/register" className="primary">Créer un compte</Link>
                        <Link to="/login">Se connecter</Link>
                    </div>
                </div>
            )}

            <div className="daily-banner-links">
                <Link to="/classements?onglet=defi" className="daily-banner-link">Classement du jour →</Link>
                <Link to="/defi" className="daily-banner-link">Défis précédents →</Link>
            </div>
        </section>
    );
}
