import {type MouseEvent, useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {FaEraser} from "react-icons/fa";
import "../SuccessPopup/SuccessPopup.scss";
import "./ResetButton.scss";

type ResetButtonProps = {
    // Vrai quand il y a quelque chose à effacer (sinon le bouton est grisé)
    enabled: boolean;
    onReset: () => void;
};

// Le bouton ne prend pas le focus : la case sélectionnée dans la grille le garde
const keepGridFocus = (e: MouseEvent<HTMLButtonElement>) => e.preventDefault();

/**
 * Bouton « Vider la grille » du panneau Actions : efface tout ce que le joueur a saisi
 * (les cases et indices donnés restent), sans relancer le chrono ni changer de partie.
 * Une confirmation est demandée avant, pour ne pas perdre sa grille sur un clic malheureux.
 */
export default function ResetButton({enabled, onReset}: ResetButtonProps) {
    const [confirming, setConfirming] = useState(false);

    // Échap ferme la confirmation
    useEffect(() => {
        if (!confirming) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setConfirming(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [confirming]);

    const confirm = () => {
        setConfirming(false);
        onReset();
    };

    return (
        <>
            <button type="button" className="reset-grid-button" disabled={!enabled} onMouseDown={keepGridFocus}
                    onClick={() => setConfirming(true)} title="Effacer tout ce que tu as saisi">
                <FaEraser aria-hidden/> Vider la grille
            </button>

            {confirming && createPortal(
                <div className="modal-overlay reset-grid-overlay" role="dialog" aria-modal="true"
                     aria-labelledby="reset-grid-title" onClick={() => setConfirming(false)}>
                    <div className="modal reset-grid-modal" onClick={e => e.stopPropagation()}>
                        <h2 id="reset-grid-title">Vider la grille ?</h2>
                        <p>Tout ce que tu as saisi sera effacé. Le chrono continue.</p>
                        <div className="modal-buttons">
                            <button type="button" className="modal-button" onClick={confirm} autoFocus>Vider</button>
                            <button type="button" className="modal-button secondary" onClick={() => setConfirming(false)}>
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}
