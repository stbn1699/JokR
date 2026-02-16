import {useEffect, useRef} from "react";
import "./SuccessPopup.scss";
import {useNavigate} from "react-router-dom";
import {confetti} from "../Confetti/Confetti.tsx";

type SuccessPopupProps = {
    open: boolean;
    gameCode: string;
};

export function SuccessPopup({open, gameCode}: SuccessPopupProps) {
    const modalRef = useRef<HTMLDivElement | null>(null);
    const overlayRef = useRef<HTMLDivElement | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!open) return;
        // confetti and focus only; the server should have recorded the win already
        confetti();
        modalRef.current?.focus();
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