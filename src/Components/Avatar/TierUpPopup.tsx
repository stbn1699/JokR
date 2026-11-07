/**
 * Popup « Nouvelle couleur ! » quand le joueur passe un palier de niveau :
 * son icône avec l'ancien contour, puis le nouveau s'écrase dessus et le remplace (comme le ×2 des défis),
 * le nom de la nouvelle couleur, et la frise des couleurs avec sa place (« toi »).
 */

import "./TierUpPopup.scss";
import "../SuccessPopup/SuccessPopup.scss";
import {useEffect, useRef} from "react";
import {LEVEL_TIERS} from "../../Services/leveling.ts";
import {confetti} from "../Confetti/Confetti.tsx";
import Avatar from "./Avatar.tsx";
import TierTrack from "./TierTrack.tsx";

type TierUpPopupProps = {
    seed?: string;
    fallback?: string;
    // niveau actuel, et premier niveau de l'ancien palier (pour dessiner l'ancien contour)
    level: number;
    fromIndex: number;
    toIndex: number;
    onClose: () => void;
};

// Moment de l'impact du nouveau contour (doit suivre tier-up-slam dans TierUpPopup.scss)
const IMPACT_MS = 1150;

export default function TierUpPopup({seed, fallback, level, fromIndex, toIndex, onClose}: TierUpPopupProps) {
    const from = LEVEL_TIERS[fromIndex]!;
    const to = LEVEL_TIERS[toIndex]!;
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        const timer = window.setTimeout(() => confetti(), reduced ? 0 : IMPACT_MS);
        buttonRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener("keydown", onKey);
        };
    }, [onClose]);

    return (
        <div className="modal-overlay success-overlay tier-up-overlay" role="dialog" aria-modal="true" aria-labelledby="tier-up-title">
            <div className={`modal success-modal tier-up tier-up-${to.id}`}>
                <p className="tier-up-kicker">Niveau {level}</p>

                <div className="tier-up-avatars" aria-hidden>
                    {/* ancien contour, remplacé à l'impact */}
                    <span className="tier-up-old">
                        <Avatar seed={seed} fallback={fallback} size={6.5} level={from.min}/>
                    </span>
                    <span className="tier-up-new">
                        <Avatar seed={seed} fallback={fallback} size={6.5} level={to.min}/>
                    </span>
                    <span className="tier-up-wave"/>
                </div>

                <h2 id="tier-up-title">
                    Nouvelle couleur : <span className={`tier-up-name ${to.id}`}>{to.name}</span> !
                </h2>
                <p className="tier-up-sub">Ton contour passe de {from.name.toLowerCase()} à {to.name.toLowerCase()}.</p>

                <TierTrack level={level}/>

                <div className="modal-buttons">
                    <button type="button" className="modal-button" ref={buttonRef} onClick={onClose}>Super !</button>
                </div>
            </div>
        </div>
    );
}
