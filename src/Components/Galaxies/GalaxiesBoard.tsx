import {type KeyboardEvent, type PointerEvent, useState} from "react";
import type {GalaxiesPuzzle} from "../../Models/galaxies.model.ts";
import {type BoardAnalysis, wallCells, wallCount, wallOnSide} from "./galaxiesRules.ts";

// Taille d'une case dans le dessin (unités SVG)
const CELL = 10;
// Distance au côté (en part de case) en dessous de laquelle un appui touche ce côté
const EDGE_HIT = 0.36;

type Side = "top" | "right" | "bottom" | "left";

const ARROW_SIDES: Record<string, Side> = {ArrowUp: "top", ArrowRight: "right", ArrowDown: "bottom", ArrowLeft: "left"};

type GalaxiesBoardProps = {
    puzzle: GalaxiesPuzzle;
    walls: Set<number>;
    hintWalls: Set<number>;
    analysis: BoardAnalysis;
    disabled: boolean;
    onToggleWall: (wall: number) => void;
    // Montrer les erreurs : zones impossibles et murs à travers un point en rouge
    showErrors: boolean;
};

// Couleur d'une galaxie terminée (une teinte par point, bien espacées, jamais rouge : le rouge signale une erreur)
const galaxyColor = (dot: number) => `hsl(${30 + ((dot * 137.5) % 300)} 70% 52% / 0.55)`;

// Segment d'un mur : [x1, y1, x2, y2] en unités SVG
function wallSegment(wall: number, width: number, height: number): [number, number, number, number] {
    const [a, b] = wallCells(wall, width, height);
    const r = Math.floor(a / width), c = a % width;
    if (b - a === width) return [c * CELL, (r + 1) * CELL, (c + 1) * CELL, (r + 1) * CELL];
    return [(c + 1) * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL];
}

/**
 * Plateau des Galaxies.
 * - Souris / doigt : un appui près du trait entre deux cases pose ou retire un mur (aperçu au survol)
 * - Clavier : flèches pour déplacer la case active, Maj + flèche pour poser / retirer le mur de ce côté
 * - Une galaxie terminée (un point, symétrique) se colore toute seule
 */
export default function GalaxiesBoard({puzzle, walls, hintWalls, analysis, disabled, onToggleWall, showErrors}: GalaxiesBoardProps) {
    const {width, height, dots} = puzzle;
    const [hoverWall, setHoverWall] = useState<number | null>(null);
    const [cursor, setCursor] = useState(0);
    const [focused, setFocused] = useState(false);

    // Mur visé par un appui à la position (x, y) du plateau, ou null au milieu d'une case
    const wallAt = (e: PointerEvent<SVGSVGElement>): number | null => {
        const rect = e.currentTarget.getBoundingClientRect();
        const fx = ((e.clientX - rect.left) / rect.width) * width;
        const fy = ((e.clientY - rect.top) / rect.height) * height;
        const c = Math.min(width - 1, Math.max(0, Math.floor(fx)));
        const r = Math.min(height - 1, Math.max(0, Math.floor(fy)));
        const dx = fx - c, dy = fy - r;
        const sides: [Side, number][] = [["top", dy], ["bottom", 1 - dy], ["left", dx], ["right", 1 - dx]];
        const [side, distance] = sides.sort((p, q) => p[1] - q[1])[0]!;
        if (distance > EDGE_HIT) return null;
        return wallOnSide(r * width + c, side, width, height);
    };

    const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
        if (e.pointerType === "mouse") setHoverWall(disabled ? null : wallAt(e));
    };

    const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
        if (disabled) return;
        const wall = wallAt(e);
        if (wall !== null) onToggleWall(wall);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        const side = ARROW_SIDES[e.key];
        if (!side || e.ctrlKey || e.metaKey || e.altKey) return;
        e.preventDefault();
        if (e.shiftKey) {
            const wall = wallOnSide(cursor, side, width, height);
            if (wall !== null && !disabled) onToggleWall(wall);
            return;
        }
        const r = Math.floor(cursor / width), c = cursor % width;
        const next = {top: [r - 1, c], bottom: [r + 1, c], left: [r, c - 1], right: [r, c + 1]}[side];
        if (next[0]! >= 0 && next[0]! < height && next[1]! >= 0 && next[1]! < width) setCursor(next[0]! * width + next[1]!);
    };

    const regionDone = (cell: number) => analysis.regions[analysis.regionOf[cell]!];

    return (
        <div className="galaxies-board" tabIndex={0} role="application"
             aria-label="Plateau : Maj + flèche pour poser ou retirer un mur"
             onKeyDown={onKeyDown} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
            <svg viewBox={`-1 -1 ${width * CELL + 2} ${height * CELL + 2}`}
                 onPointerMove={onPointerMove} onPointerLeave={() => setHoverWall(null)} onPointerUp={onPointerUp}>
                {/* Fond des cases : couleur de la galaxie terminée, rouge si la zone est impossible */}
                {Array.from({length: width * height}, (_, i) => {
                    const region = regionDone(i);
                    const fill = region?.status === "valid" ? galaxyColor(region.dots[0]!)
                        : showErrors && region?.status === "error" ? "rgba(248, 113, 113, 0.28)" : "transparent";
                    return <rect key={i} x={(i % width) * CELL} y={Math.floor(i / width) * CELL} width={CELL} height={CELL}
                                 className="galaxies-cell" fill={fill}/>;
                })}

                {/* Traits fins de la grille */}
                {Array.from({length: wallCount(width, height)}, (_, w) => {
                    const [x1, y1, x2, y2] = wallSegment(w, width, height);
                    return <line key={w} x1={x1} y1={y1} x2={x2} y2={y2} className="galaxies-gridline"/>;
                })}

                {/* Aperçu du mur sous la souris */}
                {hoverWall !== null && !hintWalls.has(hoverWall) && (() => {
                    const [x1, y1, x2, y2] = wallSegment(hoverWall, width, height);
                    return <line x1={x1} y1={y1} x2={x2} y2={y2} className="galaxies-wall preview"/>;
                })()}

                {/* Murs tracés */}
                {[...walls].map(w => {
                    const [x1, y1, x2, y2] = wallSegment(w, width, height);
                    const classes = ["galaxies-wall", hintWalls.has(w) ? "hint" : "", showErrors && analysis.badWalls.has(w) ? "bad" : ""];
                    return <line key={w} x1={x1} y1={y1} x2={x2} y2={y2} className={classes.join(" ")}/>;
                })}

                <rect x={0} y={0} width={width * CELL} height={height * CELL} className="galaxies-frame"/>

                {/* Case active au clavier */}
                {focused && (
                    <rect x={(cursor % width) * CELL + 1} y={Math.floor(cursor / width) * CELL + 1}
                          width={CELL - 2} height={CELL - 2} className="galaxies-cursor"/>
                )}

                {/* Points (pleins quand leur galaxie est terminée) */}
                {dots.map(([y, x], d) => {
                    const done = analysis.regions.some(r => r.status === "valid" && r.dots[0] === d);
                    return <circle key={d} cx={(x / 2) * CELL} cy={(y / 2) * CELL} r={CELL * 0.22}
                                   className={`galaxies-dot ${done ? "done" : ""}`}/>;
                })}
            </svg>
        </div>
    );
}
