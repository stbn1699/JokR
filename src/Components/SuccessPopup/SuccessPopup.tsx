import {useEffect, useRef} from "react";
import "./SuccessPopup.scss";
import {useNavigate} from "react-router-dom";
import {confetti} from "../Confetti/Confetti.tsx";
import sounds from "../../Services/sounds.ts";

type SuccessPopupProps = {
    open: boolean;
    gameCode: string;
    xpAwarded?: number | null;
};

export function SuccessPopup({open, gameCode, xpAwarded}: SuccessPopupProps) {
    const modalRef = useRef<HTMLDivElement | null>(null);
    const overlayRef = useRef<HTMLDivElement | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!open) return;
        // confetti and focus only; the server should have recorded the win already
        confetti();
        modalRef.current?.focus();
        sounds.winYay()
        sounds.applause()
    }, [open]);

    if (!open) return null;

    return (
        <div ref={overlayRef}
             className="modal-overlay"
             role="dialog"
             aria-modal="true">
            <div ref={modalRef}
                 className="modal"
                 tabIndex={-1}
                 style={{position: "relative", overflow: "hidden", zIndex: 1100}}>
                <h2>{gameCode} terminé !</h2>
                <p>Félicitations, vous avez réussi le {gameCode}.</p>
                {typeof xpAwarded === 'number' ? <p className="xp-awarded">XP gagné : {xpAwarded}</p> : null}

                <div className="modal-buttons">
                    <button type="button"
                            className="modal-button"
                            onClick={() => window.location.reload()}
                    >
                        Nouveau puzzle
                    </button>

                    <button type="button"
                            className="modal-button secondary"
                            onClick={() => navigate('/')}
                    >
                        Retour à l'accueil
                    </button>
                </div>
            </div>
        </div>
    );
}