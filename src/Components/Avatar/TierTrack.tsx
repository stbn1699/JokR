import "./TierTrack.scss";
import {type CSSProperties, useEffect, useRef} from "react";
import {LEVEL_TIERS, levelTierIndex} from "../../Services/leveling.ts";

/**
 * Frise des couleurs de contour, de gauche à droite : une pastille par palier, son niveau dessous,
 * une flèche « toi » sur le palier du joueur. Les paliers atteints sont pleins, les suivants grisés.
 */
// compact : dans la bulle du header (apparition plus rapide)
export default function TierTrack({level, compact = false}: { level: number; compact?: boolean }) {
    const current = levelTierIndex(level);
    const trackRef = useRef<HTMLOListElement>(null);

    // Frise plus large que l'écran (téléphone) : on centre sur le palier du joueur
    useEffect(() => {
        const track = trackRef.current;
        const me = track?.querySelector<HTMLElement>(".tier-step.current");
        if (!track || !me || track.scrollWidth <= track.clientWidth) return;
        track.scrollLeft = me.offsetLeft - (track.clientWidth - me.clientWidth) / 2;
    }, [current]);

    return (
        <ol className={`tier-track ${compact ? "compact" : ""}`} ref={trackRef} aria-label="Couleurs de contour selon le niveau">
            {LEVEL_TIERS.map((t, i) => (
                <li key={t.id} className={`tier-step ${i < current ? "past" : i === current ? "current" : "future"}`}
                    style={{"--i": i} as CSSProperties} title={`${t.name} · niveau ${t.min}`}>
                    {i === current && <span className="tier-you" aria-label="Ton palier">toi</span>}
                    <span className={`avatar-frame tier-${t.id} tier-swatch`} aria-hidden/>
                    <span className="tier-min">{t.min}</span>
                </li>
            ))}
        </ol>
    );
}
