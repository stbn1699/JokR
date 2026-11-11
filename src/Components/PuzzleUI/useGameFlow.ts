import {useState} from "react";
import {useAuth} from "../../Context/authContext.ts";
import type {Progress} from "../SuccessPopup/SuccessPopup.tsx";
import type {WinResult} from "../../Models/gameResult.model.ts";
import {rewardFx} from "../../Services/rewardFx.ts";
import {useActivity} from "../../Services/useActivity.ts";

export type ValidationResult =
    | { ok: true; result: WinResult }
    | { ok: false; message: string };

export type Victory = {
    xpAwarded: number | null;
    creditsAwarded: number | null;
    // Gains multipliés (défi du jour : 2)
    rewardMultiplier: number;
    before: Progress | null;
    durationMs: number;
    personalBest: boolean;
    daily: WinResult["daily"] | null;
};

// Chrono de la partie : démarré à la génération (ou à la reprise), figé pendant la validation, arrêté à la victoire
export type Clock = { startedAt: number | null; finalMs: number | null };

/**
 * Déroulé d'une partie, commun aux jeux de grille :
 * popup de paramètres → génération → validation → popup de victoire → nouvelle partie.
 *
 * - generate(fn) : ferme la popup de paramètres, lance la génération (fn renvoie une erreur ou null)
 *   puis démarre le chrono
 * - resume(elapsedMs) : ferme la popup et reprend le chrono d'une partie déjà commencée
 * - submit(fn) : valide la grille ; en cas d'échec, le message s'affiche dans `notice`
 *   (`validating` est vrai pendant que le serveur vérifie)
 * - newGame() : rouvre la popup de paramètres, sans recharger la page
 *
 * La partie en cours est déclarée pour les mises à jour (useActivity) : l'administrateur voit qui joue, et le
 * joueur a le temps de finir sa grille. `challenge` : défi du jour, rejoué ou d'un ami.
 */
export function useGameFlow(gameCode: string, challenge = false) {
    const {isLoggedIn, level, xp, credits, refresh} = useAuth();

    const [showSettings, setShowSettings] = useState(true);
    const [notice, setNotice] = useState<string | null>(null);
    const [victory, setVictory] = useState<Victory | null>(null);
    const [clock, setClock] = useState<Clock>({startedAt: null, finalMs: null});
    const [validating, setValidating] = useState(false);

    // Partie en cours (déclarée pour les mises à jour : l'onglet passe sur l'écran de mise à jour une fois
    // la grille validée, voir Services/maintenance.ts) ; elle continue pendant la validation
    const playingSince = clock.startedAt !== null && victory === null && !showSettings ? clock.startedAt : null;
    useActivity({page: "puzzle", gameCode, challenge, startedAt: playingSince});

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

        // Chrono figé pendant que le serveur vérifie : c'est lui qui mesure le temps officiel, inutile de
        // voir les secondes défiler si la réponse tarde (il repart si la grille est refusée)
        setClock(c => (c.startedAt !== null && c.finalMs === null ? {...c, finalMs: Math.max(0, Date.now() - c.startedAt)} : c));
        const unfreeze = () => setClock(c => ({...c, finalMs: null}));

        setValidating(true);
        let outcome: ValidationResult;
        try {
            outcome = await run();
        } catch (err) {
            unfreeze();
            throw err;
        } finally {
            setValidating(false);
        }
        if (!outcome.ok) {
            unfreeze();
            setNotice(outcome.message);
            return;
        }

        const {result} = outcome;
        // Le temps officiel est celui mesuré par le serveur
        setClock(c => ({...c, finalMs: result.durationMs}));
        // Met à jour niveau / XP dans le header, qui garde les anciennes valeurs jusqu'à
        // l'arrivée des particules (fermeture de la popup de victoire)
        if (result.xp !== undefined) {
            rewardFx.hold({level, xp, credits});
            void refresh();
        }
        setVictory({
            xpAwarded: result.xp ?? null,
            creditsAwarded: result.credits ?? null,
            rewardMultiplier: result.rewardMultiplier ?? 1,
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
        validating,
        clock,
        generate,
        resume,
        submit,
        newGame,
    };
}
