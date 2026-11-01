import {useState} from "react";
import {useAuth} from "../../Context/authContext.ts";
import type {Progress} from "../SuccessPopup/SuccessPopup.tsx";

export type ValidationResult =
    | { ok: true; xp: number | undefined }
    | { ok: false; message: string };

export type Victory = { xpAwarded: number | null; before: Progress | null };

/**
 * Déroulé d'une partie, commun aux jeux de grille :
 * popup de paramètres → génération → validation → popup de victoire → nouvelle partie.
 *
 * - generate(fn) : ferme la popup de paramètres et lance la génération (fn renvoie une erreur ou null)
 * - submit(fn) : valide la grille ; en cas d'échec, le message s'affiche dans `notice`
 * - newGame() : rouvre la popup de paramètres, sans recharger la page
 */
export function useGameFlow() {
    const {isLoggedIn, level, xp, refresh} = useAuth();

    const [showSettings, setShowSettings] = useState(true);
    const [notice, setNotice] = useState<string | null>(null);
    const [victory, setVictory] = useState<Victory | null>(null);

    const generate = async (run: () => Promise<string | null>) => {
        setShowSettings(false);
        setVictory(null);
        setNotice(null);
        const error = await run();
        if (error) setNotice(error);
    };

    const submit = async (run: () => Promise<ValidationResult>) => {
        setNotice(null);
        // Progression avant la victoire, pour animer la barre d'XP
        const before = isLoggedIn ? {level, xp} : null;

        const result = await run();
        if (!result.ok) {
            setNotice(result.message);
            return;
        }

        // Met à jour niveau / XP dans le header
        if (result.xp !== undefined) void refresh();
        setVictory({xpAwarded: result.xp ?? null, before: result.xp !== undefined ? before : null});
    };

    const newGame = () => {
        setVictory(null);
        setNotice(null);
        setShowSettings(true);
    };

    return {
        showSettings,
        notice,
        clearNotice: () => setNotice(null),
        victory,
        generate,
        submit,
        newGame,
    };
}
