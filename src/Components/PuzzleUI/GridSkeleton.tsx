import type {CSSProperties} from "react";
import "./GridSkeleton.scss";
import {hexBoard} from "../Rikudo/rikudoRules.ts";

/**
 * Grille vide affichée pendant la génération d'un puzzle, à la taille choisie : la place est prise
 * tout de suite (pas de zone vide, pas de saut quand la vraie grille arrive).
 * Une vague éclaire les cases en diagonale, avec « Génération… » au centre.
 * Même largeur que la vraie grille (--grid-width, défini par chaque jeu).
 */
export function GridSkeleton({size, label = "Génération…"}: { size: number; label?: string }) {
    return (
        <div className="grid-skeleton" style={{"--size": size} as CSSProperties} role="status" aria-label={label}>
            {Array.from({length: size * size}, (_, i) => (
                <span key={i} className="grid-skeleton-cell" aria-hidden
                      style={{"--d": Math.floor(i / size) + (i % size)} as CSSProperties}/>
            ))}
            <SkeletonLabel label={label}/>
        </div>
    );
}

// Nombre de cases du Rikudo → rayon du plateau (36 → 3, 60 → 4, 90 → 5)
const rikudoRadius = (cells: number) => Math.max(2, Math.round((-3 + Math.sqrt(9 + 12 * cells)) / 6));

/**
 * Plateau de Rikudo vide (hexagones), même géométrie que le vrai plateau.
 * La vague part du centre vers les bords.
 */
export function HexSkeleton({cells, label = "Génération…"}: { cells: number; label?: string }) {
    const board = hexBoard(rikudoRadius(cells));
    const hexWidth = (Math.sqrt(3) / board.width) * 100;
    const hexHeight = (2 / board.height) * 100;
    const place = (x: number, y: number) => ({
        left: `${((x + board.width / 2) / board.width) * 100}%`,
        top: `${((y + board.height / 2) / board.height) * 100}%`,
        width: `${hexWidth}%`,
        height: `${hexHeight}%`,
    });
    // rikudo-board : même largeur que le vrai plateau (ordinateur et téléphone)
    return (
        <div className="rikudo-board hex-skeleton" role="status" aria-label={label}
             style={{aspectRatio: `${board.width} / ${board.height}`, "--board-ratio": board.width / board.height} as CSSProperties}>
            <span className="hex-skeleton-cell hole" aria-hidden style={place(0, 0)}/>
            {board.coords.map(([q, r], i) => {
                const [x, y] = board.centers[i]!;
                // distance au centre, en anneaux
                const ring = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
                return <span key={i} className="hex-skeleton-cell" aria-hidden
                             style={{...place(x, y), "--d": ring * 2} as CSSProperties}/>;
            })}
            <SkeletonLabel label={label}/>
        </div>
    );
}

export function SkeletonLabel({label}: { label: string }) {
    return (
        <span className="grid-skeleton-label" aria-hidden>
            <span className="grid-skeleton-dots"><span/><span/><span/></span>
            {label}
        </span>
    );
}
