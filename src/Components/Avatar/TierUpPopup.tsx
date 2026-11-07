/**
 * Popup « Nouvelle couleur ! » quand le joueur passe un palier de niveau :
 * son icône avec l'ancien contour, puis le nouveau s'écrase dessus et le remplace (comme le ×2 des défis),
 * le nom de la nouvelle couleur, et la frise des couleurs avec sa place (« toi »).
 * Le palier débloque aussi son dégradé comme fond du site : on l'annonce, avec un bouton pour le mettre tout de suite.
 */

import "./TierUpPopup.scss";
import "../SuccessPopup/SuccessPopup.scss";
import {useEffect, useRef, useState} from "react";
import {LEVEL_TIERS} from "../../Services/leveling.ts";
import {confetti} from "../Confetti/Confetti.tsx";
import Avatar from "./Avatar.tsx";
import TierTrack from "./TierTrack.tsx";
import {useAuth} from "../../Context/authContext.ts";
import {shopService} from "../../Services/shop.service.ts";
import {gradientCss, tierGradientAt} from "../../Services/shopCatalog.ts";

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
    const auth = useAuth();
    const background = tierGradientAt(to.min);
    const [wearing, setWearing] = useState<"idle" | "busy" | "done" | "error">("idle");

    async function wear() {
        if (!background) return;
        setWearing("busy");
        try {
            await shopService.setBackground(background.id);
            auth.setBackground(background.id);
            setWearing("done");
        } catch {
            setWearing("error");
        }
    }

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

                {background && (
                    <div className="tier-up-unlock">
                        <span className="tier-up-unlock-swatch" style={{background: gradientCss(background)}} aria-hidden/>
                        <span className="tier-up-unlock-text">
                            <strong>Nouveau fond débloqué</strong>
                            <span>Dégradé {background.name}</span>
                        </span>
                        {auth.background === background.id ? (
                            <span className="tier-up-unlock-done">Fond actuel</span>
                        ) : (
                            <button type="button" className="tier-up-unlock-wear" disabled={wearing === "busy"} onClick={wear}>
                                {wearing === "error" ? "Réessayer" : "Mettre ce fond"}
                            </button>
                        )}
                    </div>
                )}

                <div className="modal-buttons">
                    <button type="button" className="modal-button" ref={buttonRef} onClick={onClose}>Super !</button>
                </div>
            </div>
        </div>
    );
}
