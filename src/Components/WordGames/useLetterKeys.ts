import {useEffect, useRef} from "react";

export type LetterHandlers = { onLetter: (letter: string) => void; onEnter: () => void; onBackspace: () => void };

// Clavier physique : lettres (accents ignorés), Entrée et Retour arrière
export function useLetterKeys(enabled: boolean, handlers: LetterHandlers) {
    const latest = useRef(handlers);
    useEffect(() => {
        latest.current = handlers;
    });

    useEffect(() => {
        if (!enabled) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === "Enter") {
                e.preventDefault();
                latest.current.onEnter();
            } else if (e.key === "Backspace") {
                e.preventDefault();
                latest.current.onBackspace();
            } else if (e.key.length === 1) {
                const letter = e.key.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
                if (/^[A-Z]$/.test(letter)) latest.current.onLetter(letter);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [enabled]);
}
