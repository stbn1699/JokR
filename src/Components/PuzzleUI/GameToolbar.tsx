import {type MouseEvent, type ReactNode, useState} from "react";
import {FaExclamationTriangle, FaQuestion, FaRedo, FaUndo} from "react-icons/fa";
import GameTimer from "./GameTimer.tsx";
import type {Clock} from "./useGameFlow.ts";
import "../SuccessPopup/SuccessPopup.scss";

type GameToolbarProps = {
    gameName: string;
    // Sous-titre : "Défi du jour · ×2" ou "Défi du 31 octobre"
    label?: ReactNode;
    clock: Clock;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    showErrors: boolean;
    onToggleErrors: (value: boolean) => void;
    errorCount: number;
    // Règles du jeu, affichées dans une popup (bouton « ? »)
    rules?: ReactNode;
};

// Les boutons ne prennent pas le focus : la case sélectionnée dans la grille le garde
const keepGridFocus = (e: MouseEvent<HTMLButtonElement>) => e.preventDefault();

/**
 * Barre d'outils des jeux sur téléphone (cachée sur grand écran, où le panneau Actions fait le même travail) :
 * nom du jeu, chrono, annuler / rétablir, montrer les erreurs et règles.
 * Tout tient sur une ligne au-dessus de la grille, pour jouer sans faire défiler la page.
 */
export default function GameToolbar(props: GameToolbarProps) {
    const [rulesOpen, setRulesOpen] = useState(false);

    return (
        <div className="game-toolbar">
            <div className="game-toolbar-title">
                <strong>{props.gameName}</strong>
                {props.label && <span className="game-toolbar-label">{props.label}</span>}
            </div>

            <GameTimer clock={props.clock}/>

            <div className="game-toolbar-buttons">
                <button type="button" disabled={!props.canUndo} onMouseDown={keepGridFocus} onClick={props.onUndo}
                        aria-label="Annuler">
                    <FaUndo aria-hidden/>
                </button>
                <button type="button" disabled={!props.canRedo} onMouseDown={keepGridFocus} onClick={props.onRedo}
                        aria-label="Rétablir">
                    <FaRedo aria-hidden/>
                </button>
                <button type="button" className={`errors ${props.showErrors ? "active" : ""}`} aria-pressed={props.showErrors}
                        onMouseDown={keepGridFocus} onClick={() => props.onToggleErrors(!props.showErrors)}
                        aria-label="Montrer les erreurs">
                    <FaExclamationTriangle aria-hidden/>
                    {props.showErrors && props.errorCount > 0 && <span className="game-toolbar-count">{props.errorCount}</span>}
                </button>
                {props.rules && (
                    <button type="button" onMouseDown={keepGridFocus} onClick={() => setRulesOpen(true)} aria-label="Règles">
                        <FaQuestion aria-hidden/>
                    </button>
                )}
            </div>

            {rulesOpen && (
                <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Règles"
                     onClick={() => setRulesOpen(false)}>
                    <div className="modal game-rules-modal" onClick={e => e.stopPropagation()}>
                        <h2>Règles</h2>
                        {props.rules}
                        <div className="modal-buttons">
                            <button type="button" className="modal-button" onClick={() => setRulesOpen(false)}>Compris</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
