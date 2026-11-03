import {type KeyboardEvent, type PointerEvent, useRef, useState} from "react";
import type {GalaxiesPuzzle} from "../../Models/galaxies.model.ts";
import {type BoardAnalysis, wallCells, wallCount, wallOnSide} from "./galaxiesRules.ts";

// Taille d'une case dans le dessin (unités SVG)
const CELL = 10;
// Distance au côté (en part de case) en dessous de laquelle un appui touche ce côté
const EDGE_HIT = 0.36;
// Écart minimal (en part de case) entre les deux côtés les plus proches pour savoir lequel est visé
const CORNER_GAP = 0.15;

type Side = "top" | "right" | "bottom" | "left";

const ARROW_SIDES: Record<string, Side> = {ArrowUp: "top", ArrowRight: "right", ArrowDown: "bottom", ArrowLeft: "left"};

type GalaxiesBoardProps = {
    puzzle: GalaxiesPuzzle;
    walls: Set<number>;
    hintWalls: Set<number>;
    analysis: BoardAnalysis;
    disabled: boolean;
    onToggleWall: (wall: number) => void;
    // Trait glissé : pose (ou retire) chaque mur traversé, puis fin du trait
    onPaintWall: (wall: number, on: boolean) => void;
    onEndStroke: () => void;
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
 * - Souris / doigt : un appui près du trait entre deux cases pose ou retire un mur (aperçu au survol) ;
 *   en glissant, tous les murs traversés sont posés (ou retirés si le premier l'était déjà)
 * - Clavier : flèches pour déplacer la case active, Maj + flèche pour poser / retirer le mur de ce côté
 * - Une galaxie terminée (un point, symétrique) se colore toute seule
 */
export default function GalaxiesBoard({puzzle, walls, hintWalls, analysis, disabled, onToggleWall, onPaintWall, onEndStroke, showErrors}: GalaxiesBoardProps) {
    const {width, height, dots} = puzzle;
    const [hoverWall, setHoverWall] = useState<number | null>(null);
    const [cursor, setCursor] = useState(0);
    const [focused, setFocused] = useState(false);

    // Trait en cours : poser ou retirer, et dernière position (pour ne sauter aucun mur si on glisse vite)
    const stroke = useRef<{ on: boolean; x: number; y: number } | null>(null);

    // Mur visé à la position (x, y) de l'écran, ou null au milieu d'une case
    const wallAtPoint = (svg: SVGSVGElement, x: number, y: number): number | null => {
        const rect = svg.getBoundingClientRect();
        const fx = ((x - rect.left) / rect.width) * width;
        const fy = ((y - rect.top) / rect.height) * height;
        if (fx < 0 || fy < 0 || fx > width || fy > height) return null;
        const c = Math.min(width - 1, Math.max(0, Math.floor(fx)));
        const r = Math.min(height - 1, Math.max(0, Math.floor(fy)));
        const dx = fx - c, dy = fy - r;
        const sides: [Side, number][] = [["top", dy], ["bottom", 1 - dy], ["left", dx], ["right", 1 - dx]];
        const sorted = sides.sort((p, q) => p[1] - q[1]);
        const [side, distance] = sorted[0]!;
        if (distance > EDGE_HIT) return null;
        // Tout près d'un coin, deux murs sont aussi proches : on ne choisit pas
        // (un trait le long d'une ligne ne pose pas de petit mur en travers à chaque coin)
        if (sorted[1]![1] - distance < CORNER_GAP) return null;
        return wallOnSide(r * width + c, side, width, height);
    };
    const wallAt = (e: PointerEvent<SVGSVGElement>) => wallAtPoint(e.currentTarget, e.clientX, e.clientY);

    // Appui : pose ou retire le mur visé, et commence un trait
    const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
        if (disabled || (e.pointerType === "mouse" && e.button !== 0)) return;
        const wall = wallAt(e);
        if (wall === null || hintWalls.has(wall)) return;
        const on = !walls.has(wall);
        stroke.current = {on, x: e.clientX, y: e.clientY};
        e.currentTarget.setPointerCapture(e.pointerId);
        onPaintWall(wall, on);
    };

    const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
        const current = stroke.current;
        if (!current) {
            if (e.pointerType === "mouse") setHoverWall(disabled ? null : wallAt(e));
            return;
        }
        // Points intermédiaires (tous les 1/5 de case) : un geste rapide ne saute pas de mur
        const rect = e.currentTarget.getBoundingClientRect();
        const step = rect.width / width / 5;
        const dx = e.clientX - current.x, dy = e.clientY - current.y;
        const count = Math.max(1, Math.ceil(Math.hypot(dx, dy) / step));
        for (let k = 1; k <= count; k++) {
            const wall = wallAtPoint(e.currentTarget, current.x + (dx * k) / count, current.y + (dy * k) / count);
            if (wall !== null && !hintWalls.has(wall)) onPaintWall(wall, current.on);
        }
        current.x = e.clientX;
        current.y = e.clientY;
        if (e.pointerType === "mouse") setHoverWall(wallAt(e));
    };

    const endStroke = () => {
        if (!stroke.current) return;
        stroke.current = null;
        onEndStroke();
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
                 onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endStroke}
                 onPointerCancel={endStroke} onPointerLeave={() => setHoverWall(null)}>
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
                    const classes = ["galaxies-wall", hintWalls.has(w) ? "hint" : "", showErrors && (analysis.badWalls.has(w) || analysis.strayWalls.has(w)) ? "bad" : ""];
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
