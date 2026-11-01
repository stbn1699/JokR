import {useNavigate} from "react-router-dom";
import "../SuccessPopup/SuccessPopup.scss";
import type {DailyResult} from "../../Models/daily.model.ts";
import {formatDuration} from "../../Services/format.ts";

type DailyDonePopupProps = {
    gameCode: string;
    gameName: string;
    result: DailyResult;
};

// Défi du jour déjà réussi aujourd'hui : rappel du temps et de la place
export default function DailyDonePopup({gameCode, gameName, result}: DailyDonePopupProps) {
    const navigate = useNavigate();

    return (
        <div className="modal-overlay success-overlay" role="dialog" aria-modal="true" aria-labelledby="daily-done-title">
            <div className="modal success-modal">
                <h2 id="daily-done-title">Défi du jour réussi !</h2>
                <p>
                    Tu as déjà terminé le {gameName} du jour en <strong>{formatDuration(result.durationMs)}</strong>.
                    <br/>
                    Place : <strong>{result.rank}<sup>{result.rank === 1 ? "er" : "e"}</sup></strong> sur {result.total}.
                </p>
                <p>Reviens demain pour une nouvelle grille.</p>
                <div className="modal-buttons">
                    <button type="button" className="modal-button" onClick={() => navigate(`/classements?onglet=defi`)}>
                        Voir le classement
                    </button>
                    <button type="button" className="modal-button secondary" onClick={() => navigate(`/playgame/${gameCode}`)}>
                        Partie libre
                    </button>
                </div>
            </div>
        </div>
    );
}
