import {useState} from "react";
import {flushSync} from "react-dom";
import {FaBackspace, FaKeyboard} from "react-icons/fa";
import type {LetterMark} from "../../Models/wordGames.model.ts";
import {isTouchOnly} from "../../Services/useSmallScreen.ts";
import PhoneKeyboard from "./PhoneKeyboard.tsx";
import type {LetterHandlers} from "./useLetterKeys.ts";

const ROWS = ["AZERTYUIOP", "QSDFGHJKLM", "WXCVBN"];
// Choix du joueur sur cet appareil : clavier du téléphone plutôt que celui de JokR
const PHONE_KEY = "jokr:phoneKeyboard";

function readChoice(): boolean {
    try {
        return localStorage.getItem(PHONE_KEY) === "1";
    } catch {
        return false;
    }
}

function saveChoice(phone: boolean) {
    try {
        localStorage.setItem(PHONE_KEY, phone ? "1" : "0");
    } catch {
        // stockage indisponible : le choix vaut pour cette partie
    }
}

type LetterKeyboardProps = LetterHandlers & {
    disabled: boolean;
    // Vérification d'un mot en cours : le clavier du téléphone reste ouvert (les actions sont ignorées)
    busy?: boolean;
    // Meilleur résultat connu pour chaque lettre (Devimot)
    marks?: Record<string, LetterMark>;
};

export default function LetterKeyboard({disabled, busy = false, marks, onLetter, onEnter, onBackspace}: LetterKeyboardProps) {
    const [touch] = useState(isTouchOnly);
    const [phone, setPhone] = useState(() => touch && readChoice());
    const [justChosen, setJustChosen] = useState(false);

    const choose = (next: boolean) => {
        saveChoice(next);
        // rendu immédiat : le téléphone n'ouvre son clavier que pendant l'appui du joueur
        flushSync(() => {
            setJustChosen(next);
            setPhone(next);
        });
    };

    if (phone) {
        return (
            <PhoneKeyboard disabled={disabled && !busy} autoOpen={justChosen} onLetter={onLetter} onEnter={onEnter} onBackspace={onBackspace}>
                <button type="button" disabled={disabled} onMouseDown={e => e.preventDefault()} onClick={onEnter}>Valider</button>
                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => choose(false)}>Clavier JokR</button>
            </PhoneKeyboard>
        );
    }

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
                    {index === 2 && touch && (
                        <button type="button" disabled={disabled} aria-label="Utiliser le clavier du téléphone"
                                onClick={() => choose(true)}>
                            <FaKeyboard aria-hidden/>
                        </button>
                    )}
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
