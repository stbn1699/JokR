import {useLocation, useNavigate} from "react-router-dom";
import "../SuccessPopup/SuccessPopup.scss";

/**
 * Défi ouvert sans être connecté : les défis sont réservés aux joueurs inscrits.
 * Après connexion (ou inscription puis connexion), le joueur revient sur ce défi.
 */
export default function DailyLoginRequired() {
    const navigate = useNavigate();
    const {pathname} = useLocation();

    return (
        <div className="modal-overlay success-overlay" role="dialog" aria-modal="true" aria-labelledby="daily-login-title">
            <div className="modal success-modal">
                <h2 id="daily-login-title">Défis du jour</h2>
                <p>
                    Crée un compte pour jouer aux défis du jour : la même grille pour tout le monde,
                    un classement au temps, et de l'XP à gagner.
                </p>
                <p>C'est gratuit et ça prend quelques secondes.</p>
                <div className="modal-buttons">
                    <button type="button" className="modal-button" onClick={() => navigate("/register", {state: {from: pathname}})}>
                        Créer un compte
                    </button>
                    <button type="button" className="modal-button secondary" onClick={() => navigate("/login", {state: {from: pathname}})}>
                        Se connecter
                    </button>
                </div>
                <button type="button" className="daily-login-home" onClick={() => navigate("/")}>
                    Retour à l'accueil
                </button>
            </div>
        </div>
    );
}
