import type {MouseEvent} from "react";

type HistoryButtonsProps = {
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
};

// Les boutons ne prennent pas le focus : la case sélectionnée dans la grille le garde
const keepGridFocus = (e: MouseEvent<HTMLButtonElement>) => e.preventDefault();

// Boutons Annuler / Rétablir du panneau Actions (aussi Ctrl+Z / Ctrl+Y)
export default function HistoryButtons({canUndo, canRedo, onUndo, onRedo}: HistoryButtonsProps) {
    return (
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
    );
}
