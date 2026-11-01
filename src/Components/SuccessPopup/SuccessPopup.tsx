import {useEffect, useMemo, useRef, useState} from "react";
import "./SuccessPopup.scss";
import {Link, useNavigate} from "react-router-dom";
import {confetti} from "../Confetti/Confetti.tsx";
import {xpSteps} from "../../Services/leveling.ts";
import {formatDuration} from "../../Services/format.ts";

// Durées de l'animation de la barre d'XP (ms)
const START_DELAY_MS = 450;
const FILL_MS = 900;
const LEVEL_UP_PAUSE_MS = 900;

export type Progress = { level: number; xp: number };

type SuccessPopupProps = {
    // Nom affiché du jeu ("Sudoku", "Binero")
    gameName: string;
    // XP gagnée (null si le joueur n'est pas connecté)
    xpAwarded: number | null;
    // Niveau et XP du joueur avant la victoire (null si pas connecté)
    before: Progress | null;
    // Temps de la partie (mesuré par le serveur)
    durationMs: number;
    // Meilleur temps du joueur sur cette configuration
    personalBest: boolean;
    // Défi du jour : place du joueur (absent hors défi)
    daily?: { counted: boolean; rank: number; total: number } | null;
    onNewGame: () => void;
    // Libellé du bouton "Nouvelle partie" (ex. "Partie libre" après un défi)
    newGameLabel?: string;
};

type Phase = "start" | "fill" | "levelUp";

/**
 * Popup de victoire. À afficher seulement quand la partie est gagnée (chaque affichage repart de zéro).
 *
 * Barre d'XP animée : en vert l'XP déjà acquise, en bleu l'XP gagnée qui se remplit.
 * Si le gain fait monter de niveau, la barre se remplit, "Niveau N atteint !" s'affiche,
 * puis elle repart sur le niveau suivant.
 */
export function SuccessPopup(props: SuccessPopupProps) {
    const {gameName, xpAwarded, before, durationMs, personalBest, daily, onNewGame, newGameLabel = "Nouvelle partie"} = props;
    const modalRef = useRef<HTMLDivElement | null>(null);
    const navigate = useNavigate();

    const steps = useMemo(
        () => (before && xpAwarded !== null ? xpSteps(before.level, before.xp, xpAwarded) : []),
        [before, xpAwarded],
    );
    const [stepIndex, setStepIndex] = useState(0);
    const [phase, setPhase] = useState<Phase>("start");

    useEffect(() => {
        confetti();
        modalRef.current?.focus();
    }, []);

    // Enchaînement de l'animation : départ → remplissage → (montée de niveau → étape suivante)
    useEffect(() => {
        const step = steps[stepIndex];
        if (!step) return;

        let timer: number | undefined;
        if (phase === "start") {
            timer = window.setTimeout(() => setPhase("fill"), stepIndex === 0 ? START_DELAY_MS : 50);
        } else if (phase === "fill" && step.levelUp) {
            timer = window.setTimeout(() => setPhase("levelUp"), FILL_MS);
        } else if (phase === "levelUp") {
            timer = window.setTimeout(() => {
                setStepIndex(i => i + 1);
                setPhase("start");
            }, LEVEL_UP_PAUSE_MS);
        }
        return () => window.clearTimeout(timer);
    }, [steps, stepIndex, phase]);

    const step = steps[stepIndex];
    const pct = (n: number) => (step ? `${(n / step.max) * 100}%` : "0%");
    const filled = phase !== "start";
    const levelsGained = steps.slice(0, stepIndex + (phase === "levelUp" ? 1 : 0)).filter(s => s.levelUp).length;

    return (
        <div className="modal-overlay success-overlay" role="dialog" aria-modal="true" aria-labelledby="success-title">
            <div ref={modalRef} className="modal success-modal" tabIndex={-1}>
                <h2 id="success-title">{gameName} terminé !</h2>
                <p>Bravo, tu as résolu la grille.</p>

                <div className="success-time">
                    <span>Temps : <strong>{formatDuration(durationMs)}</strong></span>
                    {personalBest && <span className="personal-best">Nouveau record !</span>}
                </div>

                {daily && (
                    <p className="daily-rank">
                        {daily.counted
                            ? <>Défi du jour : <strong>{daily.rank}<sup>{daily.rank === 1 ? "er" : "e"}</sup></strong> sur {daily.total}</>
                            : <>Défi déjà réussi aujourd'hui : cette partie ne compte pas.</>}
                        {" · "}<Link to="/classements?onglet=defi">Voir le classement</Link>
                    </p>
                )}

                {step && xpAwarded !== null ? (
                    <div className="xp-progress">
                        <div className="xp-progress-header">
                            <span className="xp-progress-level">Niveau {step.level}</span>
                            <span className="xp-progress-gain-label">+{xpAwarded} XP</span>
                        </div>

                        <div className="xp-progress-track" aria-hidden>
                            {/* XP déjà acquise sur ce niveau */}
                            <div className="xp-progress-current" style={{width: pct(step.from)}}/>
                            {/* XP gagnée : se remplit (nouvel élément à chaque niveau, pour repartir de zéro) */}
                            <div
                                key={stepIndex}
                                className="xp-progress-gain"
                                style={{
                                    left: pct(step.from),
                                    width: filled ? pct(step.to - step.from) : "0%",
                                    transitionDuration: `${FILL_MS}ms`,
                                }}
                            />
                        </div>

                        <div className="xp-progress-numbers">
                            {filled ? step.to : step.from} / {step.max} XP
                        </div>

                        {levelsGained > 0 && (
                            <p className="level-up" key={levelsGained}>
                                Niveau {before!.level + levelsGained} atteint !
                            </p>
                        )}
                    </div>
                ) : (
                    <p className="xp-guest">
                        <Link to="/login">Connecte-toi</Link> pour gagner de l'XP à chaque victoire.
                    </p>
                )}

                <div className="modal-buttons">
                    <button type="button" className="modal-button" onClick={onNewGame}>
                        {newGameLabel}
                    </button>
                    <button type="button" className="modal-button secondary" onClick={() => navigate('/')}>
                        Retour à l'accueil
                    </button>
                </div>
            </div>
        </div>
    );
}
