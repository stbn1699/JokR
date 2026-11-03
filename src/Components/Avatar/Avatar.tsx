import {useMemo} from "react";
import {avatarDesign} from "../../Services/avatar.ts";
import "./Avatar.scss";

/**
 * Icône de profil générée à partir de sa graine (voir Services/avatar.ts), style plat :
 * fond uni, gros blocs carrés collés les uns aux autres.
 * - size : côté en rem (le SVG s'adapte, net à toutes les tailles)
 * - seed absent (ancien compte, chargement) : on se rabat sur le pseudo
 */
type AvatarProps = {
    seed: string | null | undefined;
    fallback?: string;
    size?: number;
    className?: string;
    title?: string;
};

// Grille 5×5 dans le carré 100×100, avec une marge autour
const MARGIN = 12;
const CELL = (100 - 2 * MARGIN) / 5;

export default function Avatar({seed, fallback = "jokr", size = 2.5, className = "", title}: AvatarProps) {
    const key = seed || fallback;
    const design = useMemo(() => avatarDesign(key), [key]);

    return (
        <svg className={`avatar ${className}`} viewBox="0 0 100 100" width={`${size}rem`} height={`${size}rem`}
             role="img" aria-label={title ?? "Icône de profil"} shapeRendering="crispEdges">
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
}
