import {useEffect, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import "./Sudoku.scss";
import {handleKeyDown} from "./keyboardNavigation";
import {sanitizeInput} from "./sanitizeInput";
import {generateSudoku} from "./sudokuGenerator";
import validateSudoku from "./sudokuValidator";
import Confetti from "../Confetti/Confetti";

// Emitter type compatible with Confetti.emitter prop
type EmitterType =
    { rect: { x: number; y: number; width: number; height: number } }
    | { x?: number; y?: number }
    | 'center';

export default function Sudoku() {
    const inputs = useRef<HTMLInputElement[]>([]);
    const navigate = useNavigate();
    const [showSuccess, setShowSuccess] = useState(false);
    const [confettiActive, setConfettiActive] = useState(false);
    const [confettiEmitter, setConfettiEmitter] = useState<EmitterType | null>(null);
    const modalRef = useRef<HTMLDivElement | null>(null);
    const overlayRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // Génère une grille avec x chiffres placés par défaut
        const grid = generateSudoku(40);
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const val = grid[r][c];
                const idx = r * 9 + c;
                const el = inputs.current[idx];
                if (el) {
                    el.value = val === 0 ? "" : String(val);
                    // si case pré-remplie, désactiver l'édition
                    // set both readOnly and disabled for safety, and add a class
                    const isPrefilled = val !== 0;
                    el.readOnly = isPrefilled;
                    el.disabled = isPrefilled;
                    if (isPrefilled) {
                        el.classList.add('prefilled');
                    } else {
                        el.classList.remove('prefilled');
                    }
                }
            }
        }
    }, []);

    // When the modal is shown, compute modal rect and activate confetti around it
    useEffect(() => {
        if (showSuccess && modalRef.current && overlayRef.current) {
            const modalRect = modalRef.current.getBoundingClientRect();
            const overlayRect = overlayRef.current.getBoundingClientRect();
            // Compute modal rect relative to the overlay (canvas parent)
            const relX = modalRect.left - overlayRect.left;
            const relY = modalRect.top - overlayRect.top;
            const emitterRect = {x: relX, y: relY, width: modalRect.width, height: modalRect.height};
            setConfettiEmitter({rect: emitterRect});
            setConfettiActive(true);
            // Stop confetti after duration + buffer
            setTimeout(() => setConfettiActive(false), 3000);
        } else {
            setConfettiEmitter(null);
            setConfettiActive(false);
        }
    }, [showSuccess]);

    return (
        <div className="sudoku">
            <div className="game">
                <div className="grid">
                    {Array.from({length: 81}, (_, i) => (
                        <input
                            key={i}
                            data-index={i}
                            ref={(el) => {
                                if (el) inputs.current[i] = el;
                                else delete inputs.current[i];
                            }}
                            className="cell"
                            type="number"
                            min={1}
                            max={9}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder=" "
                            onKeyDown={(e) => handleKeyDown(e, inputs)}
                            onInput={sanitizeInput}
                        />
                    ))}
                </div>

                <div className="controls">
                    <button
                        type="button"
                        onClick={() => {
                            const result = validateSudoku(inputs.current);
                            if (result === 'bien joué') {
                                setShowSuccess(true);
                                // confetti activation handled in useEffect when modal mounts
                            } else if (result === 'pas fini') {
                                alert("La grille n'est pas complète. Continuez !");
                            } else {
                                alert("La solution est incorrecte. Vérifiez vos entrées.");
                            }
                            console.log(result);
                        }}
                        className="validate-button"
                    >
                        Valider
                    </button>
                </div>
            </div>

            {showSuccess && (
                <div ref={overlayRef} className="modal-overlay" role="dialog" aria-modal="true">
                    {/* Confetti canvas placed in overlay (outside modal) so particles appear around the modal. zIndex lower than modal. */}
                    <Confetti active={confettiActive} duration={2000} particleCount={160}
                              emitter={confettiEmitter ?? undefined} zIndex={1000} pointerEvents="none"/>
                    <div ref={modalRef} className="modal"
                         style={{position: 'relative', overflow: 'hidden', zIndex: 1100}}>
                        <h2>Sudoku terminé&nbsp;!</h2>
                        <p>Félicitations, vous avez réussi le Sudoku.</p>
                        <div className="modal-buttons">
                            <button
                                type="button"
                                className="modal-button"
                                onClick={() => window.location.reload()}
                            >
                                Nouveau puzzle
                            </button>
                            <button
                                type="button"
                                className="modal-button secondary"
                                onClick={() => navigate('/')}
                            >
                                Retour à l'accueil
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}