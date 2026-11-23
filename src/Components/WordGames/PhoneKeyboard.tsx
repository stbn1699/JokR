import {type FormEvent, type KeyboardEvent, type ReactNode, useEffect, useLayoutEffect, useRef, useState} from "react";
import {flushSync} from "react-dom";
import {FaKeyboard} from "react-icons/fa";
import type {LetterHandlers} from "./useLetterKeys.ts";

// Android n'envoie pas Retour arrière dans un champ vide : un caractère y reste toujours
const SENTINEL = " ";

const lettersOf = (text: string) =>
    Array.from(text.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase()).filter(c => /^[A-Z]$/.test(c));

type PhoneKeyboardProps = LetterHandlers & {
    disabled: boolean;
    // Ouvre le clavier dès l'affichage (seulement après un appui du joueur, sinon le navigateur refuse)
    autoOpen?: boolean;
    children?: ReactNode;
};

/**
 * Clavier du téléphone : un champ invisible reçoit la saisie.
 * Les claviers Android ne donnent pas les touches une par une (keydown inutilisable, texte en composition) :
 * on compare donc le contenu du champ à chaque changement.
 */
export default function PhoneKeyboard({disabled, autoOpen = false, children, ...handlers}: PhoneKeyboardProps) {
    const input = useRef<HTMLInputElement>(null);
    const previous = useRef(SENTINEL);
    const composing = useRef(false);
    const latest = useRef(handlers);
    const [open, setOpen] = useState(false);

    useLayoutEffect(() => {
        latest.current = handlers;
    });

    useLayoutEffect(() => {
        if (autoOpen) input.current?.focus();
    }, [autoOpen]);

    useEffect(() => {
        if (disabled) input.current?.blur();
    }, [disabled]);

    // Clavier ouvert : la partie se réduit à la place qui reste au-dessus
    useEffect(() => {
        const viewport = window.visualViewport;
        if (!open || !viewport) return;
        const root = document.documentElement;
        const fit = () => {
            root.style.setProperty("--phone-keyboard-height", `${viewport.height}px`);
            window.scrollTo(0, 0);
        };
        fit();
        viewport.addEventListener("resize", fit);
        return () => {
            viewport.removeEventListener("resize", fit);
            root.style.removeProperty("--phone-keyboard-height");
        };
    }, [open]);

    const clear = () => {
        const el = input.current;
        if (!el) return;
        el.value = SENTINEL;
        el.setSelectionRange(1, 1);
        previous.current = SENTINEL;
    };

    const onInput = (e: FormEvent<HTMLInputElement>) => {
        const value = e.currentTarget.value;
        const before = previous.current;
        previous.current = value;
        // Le clavier peut réécrire tout son mot en cours : seul ce qui diffère du texte précédent compte.
        // Le champ n'est pas vidé ici, sinon le clavier renverrait son mot entier à la lettre suivante.
        const [a, b] = [before.toUpperCase(), value.toUpperCase()];
        let same = 0;
        while (same < a.length && same < b.length && a[same] === b[same]) same++;
        for (let i = same; i < before.length; i++) flushSync(() => latest.current.onBackspace());
        for (const letter of lettersOf(value.slice(same))) flushSync(() => latest.current.onLetter(letter));
        if (value === "") clear();
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        latest.current.onEnter();
        if (!composing.current) clear();
    };

    return (
        <div className="phone-keyboard">
            <input ref={input} className="phone-keyboard-input" type="text" defaultValue={SENTINEL} disabled={disabled}
                   aria-label="Saisie au clavier du téléphone" autoComplete="off" autoCorrect="off" autoCapitalize="characters"
                   spellCheck={false} enterKeyHint="go"
                   onInput={onInput} onKeyDown={onKeyDown}
                   onCompositionStart={() => { composing.current = true; }}
                   onCompositionEnd={() => { composing.current = false; }}
                   onFocus={() => { setOpen(true); clear(); }}
                   onBlur={() => setOpen(false)}/>
            <button type="button" disabled={disabled} onMouseDown={e => e.preventDefault()}
                    onClick={() => (open ? input.current?.blur() : input.current?.focus())}>
                <FaKeyboard aria-hidden/> {open ? "Fermer le clavier" : "Ouvrir mon clavier"}
            </button>
            {children}
        </div>
    );
}
