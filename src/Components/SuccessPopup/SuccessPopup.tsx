import {FaCheck, FaCoins} from "react-icons/fa";
import {useEffect, useMemo, useRef, useState} from "react";
import "./SuccessPopup.scss";
import {Link, useNavigate} from "react-router-dom";
import {confetti} from "../Confetti/Confetti.tsx";
import {xpSteps} from "../../Services/leveling.ts";
import {formatDuration} from "../../Services/format.ts";
import {rewardFx} from "../../Services/rewardFx.ts";
import CountUp from "./CountUp.tsx";

// Durées de l'animation de la barre d'XP (ms)
const START_DELAY_MS = 450;
const FILL_MS = 900;
const LEVEL_UP_PAUSE_MS = 900;
// Défilement des gains (+XP, +crédits)
const COUNT_MS = 1100;
// Gains multipliés : arrivée du « ×2 » (après le défilement du gain de base) et durée de son vol
const SLAM_AT_MS = START_DELAY_MS + COUNT_MS + 350;
const SLAM_MS = 1150;

// base : gain avant multiplication · slam : le « ×2 » arrive · full : gain total
type GainPhase = "base" | "slam" | "full";

export type Progress = { level: number; xp: number };

type SuccessPopupProps = {
    // Nom affiché du jeu ("Sudoku", "Binero")
    gameName: string;
    // XP gagnée (null si le joueur n'est pas connecté)
    xpAwarded: number | null;
    // Crédits gagnés (null si le joueur n'est pas connecté)
    creditsAwarded?: number | null;
    // Gains multipliés (défi du jour : 2) ; affiché en badge s'il est supérieur à 1
    rewardMultiplier?: number;
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

// start → base (gain de base en bleu) → awaitBonus (attend le « ×2 ») → bonus (en doré)
// → sweep (le bleu recouvre le doré) → levelUp (niveau suivant)
type Phase = "start" | "base" | "awaitBonus" | "bonus" | "sweep" | "levelUp";
const PHASE_RANK: Record<Phase, number> = {start: 0, base: 1, awaitBonus: 2, bonus: 3, sweep: 4, levelUp: 5};
// Bonus du multiplicateur sur la barre : remplissage doré, puis le bleu le recouvre
const BONUS_FILL_MS = 650;
const SWEEP_MS = 700;

/**
 * Popup de victoire. À afficher seulement quand la partie est gagnée (chaque affichage repart de zéro).
 *
 * Barre d'XP animée : en vert l'XP déjà acquise, en bleu l'XP gagnée qui se remplit.
 * Si le gain fait monter de niveau, la barre se remplit, "Niveau N atteint !" s'affiche,
 * puis elle repart sur le niveau suivant.
 * Gains multipliés : la barre se remplit d'abord du gain de base ; à l'impact du « ×2 », le bonus
 * arrive en doré, puis le bleu le recouvre de gauche à droite.
 * « Voir la grille » : la popup se ferme (les gains partent vers le header) et laisse la grille résolue
 * à l'écran, avec une petite barre en bas pour relancer une partie ou revenir à l'accueil.
 */
export function SuccessPopup(props: SuccessPopupProps) {
    const {gameName, xpAwarded, creditsAwarded, rewardMultiplier = 1, before, durationMs, personalBest, daily, onNewGame, newGameLabel = "Nouvelle partie"} = props;
    const modalRef = useRef<HTMLDivElement | null>(null);
    // Points de départ des particules (XP en bleu, crédits en orange)
    const xpGainRef = useRef<HTMLSpanElement | null>(null);
    const creditsGainRef = useRef<HTMLSpanElement | null>(null);
    const flewRef = useRef(false);
    const navigate = useNavigate();
    // Popup fermée par « Voir la grille » : la grille résolue reste visible
    const [reviewing, setReviewing] = useState(false);

    // Grille affichée après la victoire : on la regarde, on n'y touche plus
    useEffect(() => {
        if (!reviewing) return;
        document.body.classList.add("game-review");
        return () => document.body.classList.remove("game-review");
    }, [reviewing]);

    // Étapes de la barre (une par niveau traversé), avec la limite entre gain de base et bonus
    const steps = useMemo(() => {
        if (!before || xpAwarded === null) return [];
        const base = rewardMultiplier > 1 ? Math.round(xpAwarded / rewardMultiplier) : xpAwarded;
        let gainedBefore = 0;
        return xpSteps(before.level, before.xp, xpAwarded).map(s => {
            const size = s.to - s.from;
            const baseEnd = s.from + Math.min(size, Math.max(0, base - gainedBefore));
            gainedBefore += size;
            return {...s, baseEnd};
        });
    }, [before, xpAwarded, rewardMultiplier]);
    const [stepIndex, setStepIndex] = useState(0);
    const [phase, setPhase] = useState<Phase>("start");

    useEffect(() => {
        confetti();
        modalRef.current?.focus();
        // Popup fermée sans passer par ses boutons (lien vers le classement...) : le header se met à jour
        return () => {
            if (!flewRef.current) rewardFx.release();
        };
    }, []);

    // Gains multipliés (défi du jour) : d'abord le gain de base, puis un gros « ×2 » s'écrase dessus
    // et les valeurs montent jusqu'au total. Sans multiplicateur (ou animations réduites) : total direct.
    const multiplied = rewardMultiplier > 1 && xpAwarded !== null;
    const [gainPhase, setGainPhase] = useState<GainPhase>(() =>
        multiplied && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "base" : "full");
    const gainLabelRef = useRef<HTMLSpanElement | null>(null);
    const slamRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (gainPhase !== "base") return;
        const timer = window.setTimeout(() => setGainPhase("slam"), SLAM_AT_MS);
        return () => window.clearTimeout(timer);
    }, [gainPhase]);

    // Le « ×2 » grossit au centre de la popup, puis plonge sur les gains
    useEffect(() => {
        if (gainPhase !== "slam") return;
        const slam = slamRef.current, label = gainLabelRef.current;
        if (!slam || !label) {
            const timer = window.setTimeout(() => setGainPhase("full"), 0);
            return () => window.clearTimeout(timer);
        }
        const s = slam.getBoundingClientRect(), l = label.getBoundingClientRect();
        // déplacement du centre du « ×2 » vers le centre des gains
        const dx = l.left + l.width / 2 - (s.left + s.width / 2);
        const dy = l.top + l.height / 2 - (s.top + s.height / 2);
        const anim = slam.animate([
            {transform: "translate(0, 0) scale(0) rotate(-200deg)", opacity: 0, offset: 0},
            {transform: "translate(0, 0) scale(1.25) rotate(8deg)", opacity: 1, offset: 0.3, easing: "ease-out"},
            {transform: "translate(0, 0) scale(1) rotate(-4deg)", opacity: 1, offset: 0.42},
            {transform: "translate(0, -12px) scale(1.08) rotate(-4deg)", opacity: 1, offset: 0.68, easing: "cubic-bezier(.6, 0, .9, .4)"},
            {transform: `translate(${dx}px, ${dy}px) scale(0.22) rotate(0deg)`, opacity: 1, offset: 1},
        ], {duration: SLAM_MS, fill: "forwards"});
        anim.onfinish = () => setGainPhase("full");
        return () => anim.cancel();
    }, [gainPhase]);

    const shownXp = xpAwarded !== null && gainPhase !== "full" ? Math.round(xpAwarded / rewardMultiplier) : xpAwarded;
    const shownCredits = creditsAwarded && gainPhase !== "full" ? Math.round(creditsAwarded / rewardMultiplier) : creditsAwarded;

    // Fermeture par un bouton : les gains s'envolent vers le header, puis l'action du bouton
    const closeWith = (action: () => void) => {
        flewRef.current = true;
        rewardFx.fly(xpGainRef.current, creditsGainRef.current);
        action();
    };

    // Enchaînement de l'animation de la barre (voir Phase)
    useEffect(() => {
        const step = steps[stepIndex];
        if (!step) return;
        const hasBonus = step.baseEnd < step.to;

        let timer: number | undefined;
        if (phase === "start") {
            timer = window.setTimeout(() => setPhase("base"), stepIndex === 0 ? START_DELAY_MS : 50);
        } else if (phase === "base" && (hasBonus || step.levelUp)) {
            // rien à remplir en bleu sur ce niveau (bonus seulement) : on passe directement
            const wait = step.baseEnd > step.from ? FILL_MS : 0;
            timer = window.setTimeout(() => setPhase(hasBonus ? "awaitBonus" : "levelUp"), wait);
        } else if (phase === "awaitBonus" && gainPhase === "full") {
            timer = window.setTimeout(() => setPhase("bonus"), 30);
        } else if (phase === "bonus") {
            timer = window.setTimeout(() => setPhase("sweep"), BONUS_FILL_MS);
        } else if (phase === "sweep" && step.levelUp) {
            timer = window.setTimeout(() => setPhase("levelUp"), SWEEP_MS);
        } else if (phase === "levelUp") {
            timer = window.setTimeout(() => {
                setStepIndex(i => i + 1);
                setPhase("start");
            }, LEVEL_UP_PAUSE_MS);
        }
        return () => window.clearTimeout(timer);
    }, [steps, stepIndex, phase, gainPhase]);

    const step = steps[stepIndex];
    const pct = (n: number) => (step ? `${(n / step.max) * 100}%` : "0%");
    const rank = PHASE_RANK[phase];
    const hasBonus = !!step && step.baseEnd < step.to;
    const baseShown = rank >= PHASE_RANK.base;
    const bonusShown = hasBonus && rank >= PHASE_RANK.bonus;
    const sweepShown = hasBonus && rank >= PHASE_RANK.sweep;
    const levelsGained = steps.slice(0, stepIndex + (phase === "levelUp" ? 1 : 0)).filter(s => s.levelUp).length;

    if (reviewing) {
        return (
            <div className="game-review-bar" role="status">
                <span className="game-review-text">
                    <FaCheck aria-hidden/> {gameName} résolu en <strong>{formatDuration(durationMs)}</strong>
                </span>
                <span className="game-review-buttons">
                    <button type="button" className="modal-button" onClick={onNewGame}>{newGameLabel}</button>
                    <button type="button" className="modal-button secondary" onClick={() => navigate('/')}>Accueil</button>
                </span>
            </div>
        );
    }

    return (
        <div className="modal-overlay success-overlay" role="dialog" aria-modal="true" aria-labelledby="success-title">
            <div ref={modalRef} className="modal success-modal" tabIndex={-1}>
                {gainPhase === "slam" && (
                    <div className="multiplier-slam-layer" aria-hidden>
                        <div ref={slamRef} className="multiplier-slam">
                            {/* rayons de lumière qui tournent derrière */}
                            <span className="multiplier-slam-rays"/>
                            <span className="multiplier-slam-text" data-text={`×${rewardMultiplier}`}>×{rewardMultiplier}</span>
                        </div>
                    </div>
                )}
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
                            <span ref={gainLabelRef}
                                  className={`xp-progress-gain-label ${multiplied && gainPhase === "full" ? "impact" : ""}`}>
                                <span ref={xpGainRef} className="xp-gain">
                                    +<CountUp value={shownXp ?? 0} delay={START_DELAY_MS} duration={COUNT_MS}/> XP
                                </span>
                                {creditsAwarded ? (
                                    <span className="credits-gain">
                                        {" · "}
                                        <span ref={creditsGainRef}>
                                            <FaCoins aria-hidden/> +<CountUp value={shownCredits ?? 0}
                                                                             delay={START_DELAY_MS + 250}
                                                                             duration={COUNT_MS * 0.7}/>
                                        </span>
                                        {" "}crédit{creditsAwarded > 1 ? "s" : ""}
                                    </span>
                                ) : null}
                                {rewardMultiplier > 1 && gainPhase === "full" && (
                                    <span className={`reward-multiplier ${multiplied ? "landed" : ""}`}
                                          title="Défi du jour : XP et crédits doublés">×{rewardMultiplier}</span>
                                )}
                            </span>
                        </div>

                        <div className="xp-progress-track" aria-hidden>
                            {/* XP déjà acquise sur ce niveau */}
                            <div className="xp-progress-current" style={{width: pct(step.from)}}/>
                            {/* XP gagnée : se remplit (nouveaux éléments à chaque niveau, pour repartir de zéro) */}
                            {/* Bonus du multiplicateur : d'abord doré, sous la barre bleue... */}
                            {hasBonus && (
                                <div
                                    key={`bonus-${stepIndex}`}
                                    className="xp-progress-bonus"
                                    style={{
                                        left: pct(step.baseEnd),
                                        width: bonusShown ? pct(step.to - step.baseEnd) : "0%",
                                        transitionDuration: `${BONUS_FILL_MS}ms`,
                                    }}
                                />
                            )}
                            {/* ... puis la barre bleue (une seule) s'allonge par-dessus, de gauche à droite */}
                            <div
                                key={`gain-${stepIndex}`}
                                className={`xp-progress-gain ${sweepShown ? "sweeping" : ""}`}
                                style={{
                                    left: pct(step.from),
                                    width: sweepShown ? pct(step.to - step.from)
                                        : baseShown ? pct(step.baseEnd - step.from) : "0%",
                                    transitionDuration: `${sweepShown ? SWEEP_MS : FILL_MS}ms`,
                                    transitionTimingFunction: sweepShown ? "cubic-bezier(.45, 0, .4, 1)" : undefined,
                                }}
                            />
                        </div>

                        <div className="xp-progress-numbers">
                            {bonusShown ? step.to : baseShown ? step.baseEnd : step.from} / {step.max} XP
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
                    <button type="button" className="modal-button" onClick={() => closeWith(onNewGame)}>
                        {newGameLabel}
                    </button>
                    <button type="button" className="modal-button secondary" onClick={() => closeWith(() => setReviewing(true))}>
                        Voir la grille
                    </button>
                    <button type="button" className="modal-button secondary" onClick={() => closeWith(() => navigate('/'))}>
                        Retour à l'accueil
                    </button>
                </div>
            </div>
        </div>
    );
}
