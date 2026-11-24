import {useState} from "react";
import {FaBomb} from "react-icons/fa";
import {useNavigate} from "react-router-dom";
import "../SuccessPopup/SuccessPopup.scss";
import {formatDuration} from "../../Services/format.ts";

/**
 * Popup de partie perdue, sur le modèle de la popup de victoire :
 * « Nouvelle partie », « Voir la grille » (la popup laisse place à une petite barre en bas) ou retour à l'accueil.
 */
export default function LostPopup({durationMs, onNewGame}: { durationMs: number; onNewGame: () => void }) {
    const navigate = useNavigate();
    const [reviewing, setReviewing] = useState(false);

    if (reviewing) {
        return (
            <div className="game-review-bar lost-review-bar" role="status">
                <span className="game-review-text"><FaBomb aria-hidden/> Perdu après <strong>{formatDuration(durationMs)}</strong></span>
                <span className="game-review-buttons">
                    <button type="button" className="modal-button" onClick={onNewGame}>Nouvelle partie</button>
                    <button type="button" className="modal-button secondary" onClick={() => navigate("/")}>Accueil</button>
                </span>
            </div>
        );
    }

    return (
        <div className="modal-overlay success-overlay" role="dialog" aria-modal="true" aria-labelledby="lost-title">
            <div className="modal success-modal">
                <h2 id="lost-title">Boum !</h2>
                <p>Tu es tombé sur une mine.</p>
                <div className="success-time">
                    <span>Temps : <strong>{formatDuration(durationMs)}</strong></span>
                </div>
                <div className="modal-buttons">
                    <button type="button" className="modal-button" onClick={onNewGame}>Nouvelle partie</button>
                    <button type="button" className="modal-button secondary" onClick={() => setReviewing(true)}>Voir la grille</button>
                    <button type="button" className="modal-button secondary" onClick={() => navigate("/")}>Retour à l'accueil</button>
                </div>
            </div>
        </div>
    );
}
