import type {FormEvent, KeyboardEvent, RefObject} from "react";
import {handleKeyDown} from "./keyboardNavigation";
import {sanitizeInput} from "./sanitizeInput";
import {hasNote} from "./gridValues.ts";

// Touches qui modifieraient une case pré-remplie
const BLOCKED_ON_CLUES = new Set(["Backspace", "Delete", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);

const NOTE_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

type SudokuGridProps = {
    inputs: RefObject<HTMLInputElement[]>;
    // Chiffre à surligner temporairement (case survolée ou en cours d'édition, null = aucun)
    onHover: (n: number | null) => void;
    // La case i vient d'être modifiée par le joueur
    onCellInput: (index: number) => void;
    // Case sélectionnée (null quand plus aucune case n'a le focus)
    onSelectCell: (index: number | null) => void;
    // Notes au crayon (masque de bits par case) et mode notes
    notes: number[];
    notesMode: boolean;
    onToggleNote: (index: number, digit: number) => void;
};

const valueOf = (el: HTMLInputElement) => (el.value === '' ? null : Number(el.value));

/**
 * Grille 9×9 : 81 inputs non contrôlés (leur contenu est géré par useSudokuGame).
 * Seules les cases vides au départ sont sélectionnables : un clic sur un indice ne fait rien.
 * Navigation aux flèches, saisie d'un chiffre 1-9, surbrillance du chiffre survolé.
 * En mode notes, un chiffre tapé ajoute / retire une note au crayon au lieu de remplir la case.
 */
export default function SudokuGrid(props: SudokuGridProps) {
    const {inputs, onHover, onCellInput, onSelectCell, notes, notesMode, onToggleNote} = props;

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.currentTarget.readOnly && BLOCKED_ON_CLUES.has(e.key)) {
            e.preventDefault();
            return;
        }
        if (notesMode && /^[1-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            onToggleNote(Number(e.currentTarget.dataset.index), Number(e.key));
            return;
        }
        handleKeyDown(e, inputs);
    };

    const onInput = (e: FormEvent<HTMLInputElement>) => {
        sanitizeInput(e);
        // La case est en cours d'édition : on surligne le chiffre qu'on vient de taper
        if (document.activeElement === e.currentTarget) onHover(valueOf(e.currentTarget));
        onCellInput(Number(e.currentTarget.dataset.index));
    };

    return (
        <div className={`grid ${notesMode ? "notes-mode" : ""}`}>
            {Array.from({length: 81}, (_, i) => (
                <div className="cell-box" key={i}>
                    <input
                        data-index={i}
                        ref={(el) => {
                            if (el) inputs.current[i] = el;
                            else delete inputs.current[i];
                        }}
                        className="cell"
                        type="number"
                        min={1}
                        max={9}
                        // Pas de clavier virtuel sur téléphone (il cacherait la grille) : on joue avec le panneau
                        inputMode="none"
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
                    {notes[i] ? (
                        <div className="notes" aria-hidden>
                            {NOTE_DIGITS.map(d => <span key={d}>{hasNote(notes[i]!, d) ? d : ""}</span>)}
                        </div>
                    ) : null}
                </div>
            ))}
        </div>
    );
}
