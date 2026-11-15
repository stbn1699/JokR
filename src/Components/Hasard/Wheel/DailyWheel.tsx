/**
 * Roue du jour (page Hasard) : un lancer gratuit par jour, qui rapporte des crédits ou de l'XP
 * (cases et chances : backend/src/utils/wheel.ts). S'ouvre toute seule à la première visite du jour
 * sur la page Hasard, et depuis sa carte.
 *
 * Le serveur tire la case et donne le gain tout de suite : le header reste figé sur l'ancien solde
 * (rewardFx.hold) le temps que la roue tourne, puis les particules partent vers le header à « Récupérer ».
 */

import "../../SuccessPopup/SuccessPopup.scss";
import "./DailyWheel.scss";
import {useEffect, useRef, useState} from "react";
import {FaCoins, FaStar} from "react-icons/fa";
import {WHEEL_SEGMENTS, type WheelSegment, wheelChance} from "../../../../backend/src/utils/wheel.ts";
import {useAuth} from "../../../Context/authContext.ts";
import {ApiError} from "../../../api/api.ts";
import {casinoService} from "../../../Services/casino.service.ts";
import {rewardFx} from "../../../Services/rewardFx.ts";
import {confetti} from "../../Confetti/Confetti.tsx";

const SPIN_MS = 5200;
const SLICE = 360 / WHEEL_SEGMENTS.length;
const R = 100;

// Couleurs des cases : crédits en doré/orangé, XP en bleu, jackpot en rouge
function segmentColors(s: WheelSegment, i: number): { fill: string; text: string } {
    if (s.jackpot) return {fill: "#dc2626", text: "#fef3c7"};
    if (s.reward === "xp") return {fill: i % 4 === 1 ? "#2563eb" : "#3b82f6", text: "#eff6ff"};
    return {fill: i % 4 === 0 ? "#f59e0b" : "#fbbf24", text: "#451a03"};
}

const fr = (n: number) => n.toLocaleString("fr-FR");
const rewardText = (s: WheelSegment) => s.reward === "xp" ? `${fr(s.amount)} XP` : `${fr(s.amount)} crédits`;

// « 5 h 12 », « 12 min »
function untilText(ms: number): string {
    const minutes = Math.max(1, Math.ceil(ms / 60_000));
    const h = Math.floor(minutes / 60);
    return h > 0 ? `${h} h ${String(minutes % 60).padStart(2, "0")}` : `${minutes} min`;
}

// Point sur le cercle, angle en degrés dans le sens des aiguilles d'une montre depuis le haut
const point = (deg: number, r: number): [number, number] => {
    const a = (deg - 90) * Math.PI / 180;
    return [Number((r * Math.cos(a)).toFixed(2)), Number((r * Math.sin(a)).toFixed(2))];
};
const at = (deg: number, r: number) => point(deg, r).join(" ");

type DailyWheelProps = {
    // déjà lancée aujourd'hui : la case du jour (la roue s'arrête dessus), sinon null
    today: { segment: number } | null;
    nextAt: number;
    // lancer fait : la page met à jour la carte
    onSpun: (segment: number) => void;
    onClose: () => void;
};

export default function DailyWheel({today, nextAt, onSpun, onClose}: DailyWheelProps) {
    const auth = useAuth();
    const [rotation, setRotation] = useState(() => today ? -today.segment * SLICE : 0);
    const [phase, setPhase] = useState<"ready" | "spinning" | "done" | "used">(today ? "used" : "ready");
    const [won, setWon] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [now, setNow] = useState(() => Date.now());
    const resultRef = useRef<HTMLSpanElement>(null);
    const heldRef = useRef(false);
    const flewRef = useRef(false);

    // compte à rebours jusqu'au prochain lancer
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 30_000);
        return () => window.clearInterval(timer);
    }, []);

    // fermée sans récupérer le gain (Échap, déconnexion...) : le header reprend ses vraies valeurs
    useEffect(() => () => {
        if (heldRef.current && !flewRef.current) rewardFx.release();
    }, []);

    const spin = async () => {
        if (phase !== "ready") return;
        setPhase("spinning");
        setError(null);
        // le header garde l'ancien solde pendant que la roue tourne
        rewardFx.hold({level: auth.level, xp: auth.xp, credits: auth.credits});
        heldRef.current = true;
        try {
            const result = await casinoService.spinWheel();
            // plusieurs tours, puis la case tirée sous la flèche, un peu décalée du centre pour faire vrai
            const jitter = (Math.random() - 0.5) * SLICE * 0.7;
            setRotation(r => {
                const base = Math.ceil(r / 360) * 360 + 360 * 6;
                return base - result.segment * SLICE + jitter;
            });
            void auth.refresh();
            window.setTimeout(() => {
                setWon(result.segment);
                setPhase("done");
                onSpun(result.segment);
                if (WHEEL_SEGMENTS[result.segment]!.jackpot) confetti();
            }, SPIN_MS);
        } catch (err) {
            rewardFx.release();
            heldRef.current = false;
            if (err instanceof ApiError && err.status === 409) {
                setPhase("used");
                setError(err.message);
            } else {
                setPhase("ready");
                setError("La roue est coincée, réessaie dans un instant.");
            }
        }
    };

    const collect = () => {
        const s = won === null ? null : WHEEL_SEGMENTS[won];
        if (s && heldRef.current) {
            flewRef.current = true;
            rewardFx.fly(s.reward === "xp" ? resultRef.current : null, s.reward === "credits" ? resultRef.current : null);
        }
        onClose();
    };

    // Échap : fermer (sauf pendant que la roue tourne)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "Escape" || phase === "spinning") return;
            if (phase === "done") collect();
            else onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    const wonSegment = won === null ? null : WHEEL_SEGMENTS[won]!;

    return (
        <div className="modal-overlay success-overlay" role="dialog" aria-modal="true" aria-labelledby="daily-wheel-title"
             onClick={e => {
                 if (e.target === e.currentTarget && phase !== "spinning") (phase === "done" ? collect : onClose)();
             }}>
            <div className="modal success-modal daily-wheel">
                <h2 id="daily-wheel-title">Roue du jour</h2>
                <p className="daily-wheel-sub">Un lancer gratuit chaque jour. Jackpot : 1 000 crédits !</p>

                <div className="daily-wheel-stage">
                    <svg className="daily-wheel-pointer" viewBox="0 0 40 44" aria-hidden>
                        <path d="M6 4H34L20 40Z"/>
                    </svg>
                    <svg className="daily-wheel-disc" viewBox="-110 -110 220 220" role="img"
                         aria-label="Roue : crédits et XP à gagner"
                         style={{transform: `rotate(${rotation}deg)`, transitionDuration: phase === "spinning" ? `${SPIN_MS}ms` : "0ms"}}>
                        <circle r="108" className="daily-wheel-rim"/>
                        {WHEEL_SEGMENTS.map((s, i) => {
                            const {fill, text} = segmentColors(s, i);
                            const from = i * SLICE - SLICE / 2, to = i * SLICE + SLICE / 2;
                            return (
                                <g key={i}>
                                    <path d={`M0 0L${at(from, R)}A${R} ${R} 0 0 1 ${at(to, R)}Z`} fill={fill}/>
                                    <g transform={`rotate(${i * SLICE})`} fill={text} textAnchor="middle">
                                        <text y={-66} className="daily-wheel-amount">{s.jackpot ? "1 000" : fr(s.amount)}</text>
                                        <text y={-50} className="daily-wheel-unit">{s.jackpot ? "JACKPOT" : s.reward === "xp" ? "XP" : "crédits"}</text>
                                    </g>
                                </g>
                            );
                        })}
                        {WHEEL_SEGMENTS.map((_, i) => {
                            const [x, y] = point(i * SLICE - SLICE / 2, R);
                            return <line key={i} x1="0" y1="0" x2={x} y2={y} className="daily-wheel-sep"/>;
                        })}
                        <circle r="22" className="daily-wheel-hub"/>
                    </svg>
                </div>

                <div className="daily-wheel-result" aria-live="polite">
                    {phase === "done" && wonSegment && (
                        <span ref={resultRef} className={`daily-wheel-won ${wonSegment.reward} ${wonSegment.jackpot ? "jackpot" : ""}`}>
                            {wonSegment.jackpot && "JACKPOT ! "}+{rewardText(wonSegment)}
                        </span>
                    )}
                    {phase === "used" && <span className="daily-wheel-wait">Prochain lancer dans {untilText(nextAt - now)}</span>}
                    {error && <span className="daily-wheel-error" role="alert">{error}</span>}
                </div>

                <div className="modal-buttons">
                    {phase === "ready" || phase === "spinning" ? (
                        <>
                            <button type="button" className="modal-button" disabled={phase === "spinning"} onClick={() => void spin()}>
                                {phase === "spinning" ? "La roue tourne…" : "Lancer la roue"}
                            </button>
                            {phase === "ready" && <button type="button" className="modal-button secondary" onClick={onClose}>Plus tard</button>}
                        </>
                    ) : phase === "done" ? (
                        <button type="button" className="modal-button" onClick={collect}>
                            Récupérer {wonSegment?.reward === "xp" ? <FaStar aria-hidden/> : <FaCoins aria-hidden/>}
                        </button>
                    ) : (
                        <button type="button" className="modal-button secondary" onClick={onClose}>Fermer</button>
                    )}
                </div>

                <details className="daily-wheel-odds">
                    <summary>Les chances</summary>
                    <ul>
                        {WHEEL_SEGMENTS.map((s, i) => ({s, i})).sort((a, b) => b.s.weight - a.s.weight).map(({s, i}) => (
                            <li key={i}><span>{s.jackpot ? "Jackpot · " : ""}{rewardText(s)}</span><span>{fr(wheelChance(s))} %</span></li>
                        ))}
                    </ul>
                </details>
            </div>
        </div>
    );
}
