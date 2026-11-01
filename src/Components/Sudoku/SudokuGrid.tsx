import type {FormEvent, KeyboardEvent, RefObject} from "react";
import {handleKeyDown} from "./keyboardNavigation";
import {sanitizeInput} from "./sanitizeInput";

// Touches qui modifieraient une case pré-remplie
const BLOCKED_ON_CLUES = new Set(["Backspace", "Delete", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);

type SudokuGridProps = {
    inputs: RefObject<HTMLInputElement[]>;
    // Chiffre à surligner temporairement (case survolée ou en cours d'édition, null = aucun)
    onHover: (n: number | null) => void;
    // Une case vient d'être modifiée par le joueur
    onCellInput: () => void;
    // Case sélectionnée (null quand plus aucune case n'a le focus)
    onSelectCell: (index: number | null) => void;
};

const valueOf = (el: HTMLInputElement) => (el.value === '' ? null : Number(el.value));

/**
 * Grille 9×9 : 81 inputs non contrôlés (leur contenu est géré par useSudokuGame).
 * Seules les cases vides au départ sont sélectionnables : un clic sur un indice ne fait rien.
 * Navigation aux flèches, saisie d'un chiffre 1-9, surbrillance du chiffre survolé.
 */
export default function SudokuGrid({inputs, onHover, onCellInput, onSelectCell}: SudokuGridProps) {
    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.currentTarget.readOnly && BLOCKED_ON_CLUES.has(e.key)) {
            e.preventDefault();
            return;
        }
        handleKeyDown(e, inputs);
    };

    const onInput = (e: FormEvent<HTMLInputElement>) => {
        sanitizeInput(e);
        // La case est en cours d'édition : on surligne le chiffre qu'on vient de taper
        if (document.activeElement === e.currentTarget) onHover(valueOf(e.currentTarget));
        onCellInput();
    };

    return (
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
                    onMouseDown={(e) => {
                        // Un indice ne prend pas le focus au clic
                        if (e.currentTarget.readOnly) e.preventDefault();
                    }}
                    onKeyDown={onKeyDown}
                    onInput={onInput}
                    onMouseEnter={(e) => {
                        const v = valueOf(e.currentTarget);
                        if (v !== null) onHover(v);
                    }}
                    onMouseLeave={() => onHover(null)}
                    onFocus={(e) => {
                        onSelectCell(i);
                        const v = valueOf(e.currentTarget);
                        if (v !== null) onHover(v);
                    }}
                    onBlur={() => {
                        onSelectCell(null);
                        onHover(null);
                    }}
                />
            ))}
        </div>
    );
}
