/**
 * Fête du nouveau monde, sur la carte des niveaux, quand le dernier niveau d'un monde est réussi (50, 100…) :
 * une fenêtre sur le monde terminé avec un cadenas au milieu, qui tremble puis éclate ; le nouveau monde s'ouvre
 * alors en cercle depuis le centre (avec ses particules), son nom arrive dans sa couleur, et des confettis.
 * Même esprit que la popup « Nouvelle couleur ! » du contour de profil (TierUpPopup).
 */

import "./WorldUnlockPopup.scss";
import "../SuccessPopup/SuccessPopup.scss";
import {type CSSProperties, useEffect, useRef} from "react";
import {FaLock, FaLockOpen} from "react-icons/fa";
import {confetti} from "../Confetti/Confetti.tsx";
import WorldBackdrop from "./WorldBackdrop.tsx";
import {worldAt, WORLD_SIZE} from "./worlds.ts";

// Moment où le cadenas éclate et où le nouveau monde s'ouvre (doit suivre world-unlock-* dans WorldUnlockPopup.scss)
const BURST_MS = 1300;

type Props = {
    // monde ouvert (à partir de 0) ; le précédent vient d'être terminé
    world: number;
    // nombre de niveaux du jeu (pour « 50 niveaux », moins dans le dernier monde)
    count: number;
    onClose: () => void;
};

export default function WorldUnlockPopup({world, count, onClose}: Props) {
    const from = worldAt(world - 1);
    const to = worldAt(world);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const first = world * WORLD_SIZE + 1;
    const last = Math.min(count, (world + 1) * WORLD_SIZE);

    useEffect(() => {
        const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        const timer = window.setTimeout(() => confetti(), reduced ? 0 : BURST_MS);
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
        <div className="modal-overlay success-overlay world-unlock-overlay" role="dialog" aria-modal="true" aria-labelledby="world-unlock-title">
            <div className="modal success-modal world-unlock"
                 style={{"--w-accent": to.accent, "--w-ink": to.ink, "--w-old": from.accent} as CSSProperties}>
                <p className="world-unlock-kicker">Monde {world} terminé · {from.name}</p>

                <div className="world-unlock-window" aria-hidden>
                    <div className="world-unlock-old"><WorldBackdrop index={world - 1} world={from} framed/></div>
                    <div className="world-unlock-new"><WorldBackdrop index={world} world={to} framed/></div>
                    <span className="world-unlock-flash"/>
                    <span className="world-unlock-wave"/>
                    <span className="world-unlock-lock">
                        <FaLock className="closed"/>
                        <FaLockOpen className="open"/>
                    </span>
                </div>

                <h2 id="world-unlock-title">
                    Nouveau monde : <span className="world-unlock-name">{to.name}</span> !
                </h2>
                <p className="world-unlock-sub">
                    Monde {world + 1} · {last - first + 1} niveaux
                </p>

                <div className="modal-buttons">
                    <button type="button" className="modal-button world-unlock-go" ref={buttonRef} onClick={onClose}>En route !</button>
                </div>
            </div>
        </div>
    );
}
