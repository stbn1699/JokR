import type {FormEvent} from 'react';
import {useEffect, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import "./Sudoku.scss";
import {handleKeyDown} from "./keyboardNavigation";
import {sanitizeInput} from "./sanitizeInput";
import {generateSudoku} from "./sudokuGenerator";
import validateSudoku from "./sudokuValidator";
import Confetti from "../Confetti/Confetti";
import {gameStatsService} from "../../Services/gameStats.service.ts";

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

    // Nombre de chiffres pré-remplis (modifiable via l'onglet Options)
    const [cluesCount, setCluesCount] = useState<number>(40);

    // Nombre actuellement survolé / sélectionné (null = aucun)
    const [highlightNumber, setHighlightNumber] = useState<number | null>(null);

    const resetOptions = () => {
        setCluesCount(40);
        generateGrid(cluesCount);
    }

    // Fonction réutilisable pour générer/peupler la grille
    const generateGrid = (count: number) => {
        // close any success modal/confetti when generating a new puzzle
        setShowSuccess(false);
        setConfettiActive(false);
        setConfettiEmitter(null);
        setHighlightNumber(null);

        const grid = generateSudoku(count);
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const val = grid[r][c];
                const idx = r * 9 + c;
                const el = inputs.current[idx];
                if (el) {
                    el.value = val === 0 ? "" : String(val);
                    // keep a data-value attribute in-sync for easier DOM checks (useful for highlighting)
                    el.setAttribute('data-value', val === 0 ? '' : String(val));
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
    };

    useEffect(() => {
        generateGrid(cluesCount);
    }, [cluesCount]);

    // Apply/remove highlight class to all cells when highlightNumber changes
    useEffect(() => {
        const numStr = highlightNumber === null ? null : String(highlightNumber);
        inputs.current.forEach((el) => {
            if (!el) return;
            const val = el.value ?? el.getAttribute('data-value') ?? '';
            if (numStr !== null && val === numStr) {
                el.classList.add('same-number-highlight');
            } else {
                el.classList.remove('same-number-highlight');
            }
        });
    }, [highlightNumber]);

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

            <div className="options">
                <h2 className="title">Options</h2>

                <div className="parameters-container">
                    <div className="cluesRange">
                        <label htmlFor="cluesRange">Difficulté&nbsp;:</label>
                        <input
                            id="cluesRange"
                            type="range"
                            min={10}
                            max={60}
                            step={1}
                            value={80 - cluesCount}
                            onChange={(e) => setCluesCount(80 - Number(e.target.value))}
                        />
                    </div>
                </div>

                <div className="buttons-container">
                    <button type="button" className="reset-button" onClick={() => resetOptions()}>
                        Réinitialiser
                    </button>
                    <button type="button" className="generate-button" onClick={() => generateGrid(cluesCount)}>
                        Générer
                    </button>
                </div>
            </div>

            <div className="game">
                <h1 className="title">Sudoku</h1>

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
                            onInput={(e: FormEvent<HTMLInputElement>) => {
                                // run existing sanitizer and keep data-value updated
                                sanitizeInput(e);
                                const target = e.currentTarget as HTMLInputElement;
                                target.setAttribute('data-value', target.value ?? '');
                                // if this cell is focused, update the highlight to reflect typed value
                                if (document.activeElement === target) {
                                    const v = target.value;
                                    setHighlightNumber(v ? Number(v) : null);
                                }
                            }}
                            onMouseEnter={(e) => {
                                const v = (e.currentTarget as HTMLInputElement).value;
                                if (v !== '') setHighlightNumber(Number(v));
                            }}
                            onMouseLeave={() => setHighlightNumber(null)}
                            onFocus={(e) => {
                                const v = (e.currentTarget as HTMLInputElement).value;
                                if (v !== '') setHighlightNumber(Number(v));
                            }}
                            onBlur={() => setHighlightNumber(null)}
                        />
                    ))}
                </div>
            </div>

            <div className="actions">

                <h2 className="title">Actions</h2>

                <button
                    type="button"
                    onClick={() => {
                        const gameWon: boolean | null = validateSudoku(inputs.current);

                        if (gameWon != null) {
                            if (gameWon) {
                                const userId: string | null = window.localStorage.getItem('userId')
                                if (userId) {
                                    gameStatsService.gameWin(userId, 1);
                                }
                                setShowSuccess(true);
                            } else {
                                alert("La solution est incorrecte. Vérifiez vos entrées.");
                            }
                        } else {
                            alert("La grille n'est pas complète. Continuez !");
                        }
                    }}
                    className="validate-button">
                    Valider
                </button>
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