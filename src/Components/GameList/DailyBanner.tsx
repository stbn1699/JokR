import {Link} from "react-router-dom";
import {FaCalendarDay} from "react-icons/fa";
import "./DailyBanner.scss";
import {formatDailyDate} from "../../Services/daily.service.ts";
import type {DailyOverview} from "../../Models/daily.model.ts";
import {useAuth} from "../../Context/authContext.ts";

/**
 * Ligne "Défi du jour" en haut de l'accueil : date, invitation à créer un compte pour les invités,
 * liens vers le classement du jour et les défis précédents.
 * Les défis eux-mêmes se lancent depuis le bouton sous chaque jeu (voir GameList).
 */
export default function DailyBanner({overview}: { overview: DailyOverview }) {
    const {isLoggedIn} = useAuth();

    return (
        <section className="daily-banner" aria-label="Défi du jour">
            <p className="daily-banner-text">
                <FaCalendarDay className="daily-banner-icon" aria-hidden/>
                <strong>Défi du jour</strong> · {formatDailyDate(overview.date)}
                <span className="daily-banner-hint">
                    {isLoggedIn
                        ? " — la même grille pour tout le monde"
                        : <> — <Link to="/register">crée un compte</Link> pour y jouer</>}
                </span>
            </p>
            <div className="daily-banner-links">
                <Link to="/classements?onglet=defi">Classement du jour</Link>
                <Link to="/defi">Défis précédents</Link>
            </div>
        </section>
    );
}
