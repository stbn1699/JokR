import "./LevelBubble.scss";
import "./TierUpPopup.scss";
import {useEffect, useRef} from "react";
import {LEVEL_TIERS, levelTierIndex, xpToNextLevel} from "../../Services/leveling.ts";
import Avatar from "./Avatar.tsx";
import TierTrack from "./TierTrack.tsx";

type LevelBubbleProps = {
    level: number;
    xp: number;
    seed?: string;
    fallback?: string;
    // Position sous le header (px depuis le haut de l'écran)
    top: number;
    onClose: () => void;
};

/**
 * Bulle « où j'en suis » (clic sur le niveau du header) : couleur actuelle du contour, XP du niveau,
 * prochaine couleur et dans combien de niveaux, et la frise des couleurs (comme la popup « Nouvelle couleur »).
 * Se ferme avec Échap, la croix ou un clic ailleurs.
 */
export default function LevelBubble({level, xp, seed, fallback, top, onClose}: LevelBubbleProps) {
    const ref = useRef<HTMLDivElement>(null);
    const index = levelTierIndex(level);
    const tier = LEVEL_TIERS[index]!;
    const next = LEVEL_TIERS[index + 1];
    const xpNext = xpToNextLevel(level);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            // le clic sur le niveau lui-même est géré par son bouton (ouvrir / fermer)
            if (!ref.current?.contains(e.target as Node) && !(e.target as Element).closest?.(".level-badge")) onClose();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onKey);
        };
    }, [onClose]);

    return (
        <div className="level-bubble" ref={ref} role="dialog" aria-label="Ton niveau et ta couleur de contour" style={{top}}>
            <button type="button" className="level-bubble-close" aria-label="Fermer" onClick={onClose}>×</button>

            <div className="level-bubble-head">
                <Avatar seed={seed} fallback={fallback} size={3.6} level={level} showLevel/>
                <div className="level-bubble-info">
                    <span className="level-bubble-title">
                        Niveau {level} · <span className={`tier-up-name ${tier.id}`}>{tier.name}</span>
                    </span>
                    <span className="level-bubble-bar" aria-hidden>
                        <span style={{width: `${Math.min(100, (xp / xpNext) * 100)}%`}}/>
                    </span>
                    <small>{xp.toLocaleString("fr-FR")} / {xpNext.toLocaleString("fr-FR")} XP vers le niveau {level + 1}</small>
                </div>
            </div>

            <p className="level-bubble-next">
                {next
                    ? <>Prochaine couleur : <span className={`tier-up-name ${next.id}`}>{next.name}</span> au niveau {next.min}
                        <small> · encore {next.min - level} niveau{next.min - level > 1 ? "x" : ""}</small></>
                    : <>Tu as atteint la dernière couleur. Bravo !</>}
            </p>

            <TierTrack level={level} compact/>
        </div>
    );
}
