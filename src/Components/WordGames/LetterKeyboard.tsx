import {FaBackspace} from "react-icons/fa";
import type {LetterMark} from "../../Models/wordGames.model.ts";
import type {LetterHandlers} from "./useLetterKeys.ts";

const ROWS = ["AZERTYUIOP", "QSDFGHJKLM", "WXCVBN"];

type LetterKeyboardProps = LetterHandlers & {
    disabled: boolean;
    // Meilleur résultat connu pour chaque lettre (Devimot)
    marks?: Record<string, LetterMark>;
};

export default function LetterKeyboard({disabled, marks, onLetter, onEnter, onBackspace}: LetterKeyboardProps) {
    return (
        <div className="letter-keyboard" role="group" aria-label="Clavier">
            {ROWS.map((row, index) => (
                <div className="letter-keyboard-row" key={row}>
                    {index === 2 && <button type="button" className="wide" disabled={disabled} onMouseDown={e => e.preventDefault()} onClick={onEnter}>Valider</button>}
                    {Array.from(row, letter => (
                        <button type="button" key={letter} className={marks?.[letter] ?? ""} disabled={disabled}
                                onMouseDown={e => e.preventDefault()} onClick={() => onLetter(letter)}>
                            {letter}
                        </button>
                    ))}
                    {index === 2 && (
                        <button type="button" className="wide" disabled={disabled} aria-label="Effacer"
                                onMouseDown={e => e.preventDefault()} onClick={onBackspace}>
                            <FaBackspace aria-hidden/>
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
