import {useState} from "react";
import {useAuth} from "../../Context/authContext.ts";
import type {Progress} from "../SuccessPopup/SuccessPopup.tsx";
import type {WinResult} from "../../Models/gameResult.model.ts";

export type ValidationResult =
    | { ok: true; result: WinResult }
    | { ok: false; message: string };

export type Victory = {
    xpAwarded: number | null;
    before: Progress | null;
    durationMs: number;
    personalBest: boolean;
    daily: WinResult["daily"] | null;
};

// Chrono de la partie : démarré à la génération (ou à la reprise), arrêté à la victoire
export type Clock = { startedAt: number | null; finalMs: number | null };

/**
 * Déroulé d'une partie, commun aux jeux de grille :
 * popup de paramètres → génération → validation → popup de victoire → nouvelle partie.
 *
 * - generate(fn) : ferme la popup de paramètres, lance la génération (fn renvoie une erreur ou null)
 *   puis démarre le chrono
 * - resume(elapsedMs) : ferme la popup et reprend le chrono d'une partie déjà commencée
 * - submit(fn) : valide la grille ; en cas d'échec, le message s'affiche dans `notice`
 * - newGame() : rouvre la popup de paramètres, sans recharger la page
 */
export function useGameFlow() {
    const {isLoggedIn, level, xp, refresh} = useAuth();

    const [showSettings, setShowSettings] = useState(true);
    const [notice, setNotice] = useState<string | null>(null);
    const [victory, setVictory] = useState<Victory | null>(null);
    const [clock, setClock] = useState<Clock>({startedAt: null, finalMs: null});

    const generate = async (run: () => Promise<string | null>) => {
        setShowSettings(false);
        setVictory(null);
        setNotice(null);
        setClock({startedAt: null, finalMs: null});
        const error = await run();
        if (error) setNotice(error);
        else setClock({startedAt: Date.now(), finalMs: null});
    };

    const resume = (elapsedMs: number) => {
        setShowSettings(false);
        setVictory(null);
        setNotice(null);
        setClock({startedAt: Date.now() - elapsedMs, finalMs: null});
    };

    const submit = async (run: () => Promise<ValidationResult>) => {
        setNotice(null);
        // Progression avant la victoire, pour animer la barre d'XP
        const before = isLoggedIn ? {level, xp} : null;

        const outcome = await run();
        if (!outcome.ok) {
            setNotice(outcome.message);
            return;
        }

        const {result} = outcome;
        // Le temps officiel est celui mesuré par le serveur
        setClock(c => ({...c, finalMs: result.durationMs}));
        // Met à jour niveau / XP dans le header
        if (result.xp !== undefined) void refresh();
        setVictory({
            xpAwarded: result.xp ?? null,
            before: result.xp !== undefined ? before : null,
            durationMs: result.durationMs,
            personalBest: result.personalBest === true,
            daily: result.daily ?? null,
        });
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
        setNotice,
        victory,
        clock,
        generate,
        resume,
        submit,
        newGame,
    };
}
