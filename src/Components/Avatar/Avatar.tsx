import {type CSSProperties, useMemo} from "react";
import {avatarDesign} from "../../Services/avatar.ts";
import {LEVEL_TIER_NAMES, levelTier} from "../../Services/leveling.ts";
import "./Avatar.scss";

/**
 * Icône de profil générée à partir de sa graine (voir Services/avatar.ts), style plat :
 * fond uni, gros blocs carrés collés les uns aux autres.
 * - size : côté en rem, contour compris (le SVG s'adapte, net à toutes les tailles)
 * - seed absent (ancien compte, chargement) : on se rabat sur le pseudo
 * - level : contour cuivré, argenté, doré ou diamant selon le niveau (sans level : pas de contour)
 * - showLevel : numéro du niveau en bas à droite
 */
type AvatarProps = {
    seed: string | null | undefined;
    fallback?: string;
    size?: number;
    className?: string;
    title?: string;
    level?: number | undefined;
    showLevel?: boolean;
};

// Grille 5×5 dans le carré 100×100, avec une marge autour
const MARGIN = 12;
const CELL = (100 - 2 * MARGIN) / 5;

export default function Avatar({seed, fallback = "jokr", size = 2.5, className = "", title, level, showLevel = false}: AvatarProps) {
    const key = seed || fallback;
    const design = useMemo(() => avatarDesign(key), [key]);
    const label = title ?? "Icône de profil";

    const icon = (
        <svg className={level === undefined ? `avatar ${className}` : "avatar"} viewBox="0 0 100 100"
             width={level === undefined ? `${size}rem` : "100%"} height={level === undefined ? `${size}rem` : "100%"}
             role="img" aria-label={label} shapeRendering="crispEdges">
            {title && <title>{title}</title>}
            <rect width="100" height="100" fill={design.background}/>
            {design.cells.map(c => (
                // un poil plus grand que la case : pas de fine ligne entre deux blocs voisins
                <rect key={`${c.x}-${c.y}`}
                      x={MARGIN + c.x * CELL} y={MARGIN + c.y * CELL}
                      width={CELL + 0.4} height={CELL + 0.4}
                      fill={design.color}/>
            ))}
        </svg>
    );
    if (level === undefined) return icon;

    const tier = levelTier(level);
    return (
        <span className={`avatar-frame tier-${tier} ${className}`} style={{"--avatar-size": `${size}rem`} as CSSProperties}
              title={title ? undefined : `Niveau ${level} · ${LEVEL_TIER_NAMES[tier]}`}>
            {icon}
            {showLevel && <span className="avatar-level" aria-label={`Niveau ${level}`}>{level}</span>}
        </span>
    );
}
