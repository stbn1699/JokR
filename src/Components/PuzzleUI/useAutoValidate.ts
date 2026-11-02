import {useEffect, useRef} from "react";

// Petit délai : laisse le temps d'un annuler juste après avoir posé le dernier chiffre
const AUTO_VALIDATE_DELAY_MS = 300;

export const GRID_HAS_ERRORS = "La grille est remplie mais contient une erreur.";

type AutoValidateOptions = {
    // Contenu de la grille (texte) quand elle est entièrement remplie, null sinon
    filledKey: string | null;
    playing: boolean;
    // Erreurs vues dans le navigateur (mêmes règles que « Montrer les erreurs »)
    hasErrors: boolean;
    submit: () => Promise<void>;
    setNotice: (message: string | null) => void;
};

/**
 * Valide la partie toute seule dès que la grille est remplie (plus de bouton Valider).
 *
 * - Grille remplie sans erreur : envoyée au serveur, une seule fois par grille
 * - Grille remplie avec une erreur : rien n'est envoyé, un message le signale
 * - Grille de nouveau incomplète : le message disparaît
 */
export function useAutoValidate({filledKey, playing, hasErrors, submit, setNotice}: AutoValidateOptions) {
    const lastKeyRef = useRef<string | null>(null);
    const busyRef = useRef(false);
    const submitRef = useRef(submit);
    const noticeRef = useRef(setNotice);

    useEffect(() => {
        submitRef.current = submit;
        noticeRef.current = setNotice;
    });

    useEffect(() => {
        if (filledKey === null) {
            if (lastKeyRef.current !== null) {
                lastKeyRef.current = null;
                noticeRef.current(null);
            }
            return;
        }
        if (!playing || filledKey === lastKeyRef.current) return;

        const timer = setTimeout(() => {
            if (busyRef.current) return;
            lastKeyRef.current = filledKey;
            if (hasErrors) {
                noticeRef.current(GRID_HAS_ERRORS);
                return;
            }
            busyRef.current = true;
            void submitRef.current().finally(() => {
                busyRef.current = false;
            });
        }, AUTO_VALIDATE_DELAY_MS);
        return () => clearTimeout(timer);
    }, [filledKey, playing, hasErrors]);
}
