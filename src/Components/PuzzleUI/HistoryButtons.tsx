import type {MouseEvent} from "react";
import ResetButton from "./ResetButton.tsx";

type HistoryButtonsProps = {
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    // « Vider la grille » : efface toutes les saisies du joueur (absent : pas de bouton)
    onReset?: () => void;
    canReset?: boolean;
};

// Les boutons ne prennent pas le focus : la case sélectionnée dans la grille le garde
const keepGridFocus = (e: MouseEvent<HTMLButtonElement>) => e.preventDefault();

// Boutons Annuler / Rétablir du panneau Actions (aussi Ctrl+Z / Ctrl+Y), puis « Vider la grille »
export default function HistoryButtons({canUndo, canRedo, onUndo, onRedo, onReset, canReset = false}: HistoryButtonsProps) {
    return (
        <div className="history-block">
            <div className="history-buttons">
                <button type="button" disabled={!canUndo} onMouseDown={keepGridFocus} onClick={onUndo}
                        title="Annuler (Ctrl+Z)">
                    ↶ Annuler
                </button>
                <button type="button" disabled={!canRedo} onMouseDown={keepGridFocus} onClick={onRedo}
                        title="Rétablir (Ctrl+Y)">
                    Rétablir ↷
                </button>
            </div>
            {onReset && <ResetButton enabled={canReset} onReset={onReset}/>}
        </div>
    );
}
