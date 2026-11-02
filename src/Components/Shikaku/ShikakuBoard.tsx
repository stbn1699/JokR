import {type KeyboardEvent, type PointerEvent, useState} from "react";
import type {Rect, ShikakuPuzzle} from "../../Models/shikaku.model.ts";
import {rectBetween, type ShikakuAnalysis} from "./shikakuRules.ts";

// Taille d'une case dans le dessin (unités SVG)
const CELL = 10;

const ARROWS: Record<string, [number, number]> = {ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1]};

type ShikakuBoardProps = {
    puzzle: ShikakuPuzzle;
    // Rectangles donnés (les `hintCount` premiers) puis posés
    rects: Rect[];
    hintCount: number;
    analysis: ShikakuAnalysis;
    disabled: boolean;
    onDraw: (rect: Rect) => void;
    onErase: (cell: number) => void;
    // Montrer les erreurs : rectangles faux en rouge
    showErrors: boolean;
};

// Couleur d'un rectangle juste (une teinte par nombre, bien espacées, jamais rouge : le rouge signale une erreur)
const rectColor = (clue: number) => `hsl(${30 + ((clue * 137.5) % 300)} 70% 52% / 0.5)`;

/**
 * Plateau du Shikaku.
 * - Souris / doigt : glisser d'une case à une autre trace le rectangle entre les deux (aperçu avec son aire) ;
 *   un appui sur un rectangle posé l'efface
 * - Clavier : flèches pour se déplacer, Entrée pour commencer puis poser un rectangle, Suppr pour effacer,
 *   Échap pour annuler
 * - Un rectangle juste (un seul nombre, égal à son aire) se colore
 */
export default function ShikakuBoard({puzzle, rects, hintCount, analysis, disabled, onDraw, onErase, showErrors}: ShikakuBoardProps) {
    const {width, height, clues} = puzzle;
    // Glissé en cours : case de départ et case actuelle
    const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
    const [cursor, setCursor] = useState(0);
    const [anchor, setAnchor] = useState<number | null>(null);
    const [focused, setFocused] = useState(false);

    const cellAt = (e: PointerEvent<SVGSVGElement>): number => {
        const rect = e.currentTarget.getBoundingClientRect();
        // viewBox : une marge d'une unité autour de la grille
        const unit = rect.width / (width * CELL + 2);
        const c = Math.floor((e.clientX - rect.left - unit) / (unit * CELL));
        const r = Math.floor((e.clientY - rect.top - unit) / (unit * CELL));
        return Math.min(height - 1, Math.max(0, r)) * width + Math.min(width - 1, Math.max(0, c));
    };

    const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
        if (disabled) return;
        // Le glissé continue même si le doigt sort du plateau
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
            // pointeur déjà relâché : rien à capturer
        }
        const cell = cellAt(e);
        setDrag({from: cell, to: cell});
    };

    const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
        if (!drag) return;
        const cell = cellAt(e);
        if (cell !== drag.to) setDrag({...drag, to: cell});
    };

    const onPointerUp = () => {
        if (!drag) return;
        if (drag.from === drag.to) onErase(drag.from);
        else onDraw(rectBetween(drag.from, drag.to, width));
        setDrag(null);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const move = ARROWS[e.key];
        if (move) {
            e.preventDefault();
            const r = Math.min(height - 1, Math.max(0, Math.floor(cursor / width) + move[0]));
            const c = Math.min(width - 1, Math.max(0, (cursor % width) + move[1]));
            setCursor(r * width + c);
        } else if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            if (anchor === null) setAnchor(cursor);
            else {
                if (anchor !== cursor) onDraw(rectBetween(anchor, cursor, width));
                setAnchor(null);
            }
        } else if ((e.key === "Delete" || e.key === "Backspace") && !disabled) {
            e.preventDefault();
            onErase(cursor);
        } else if (e.key === "Escape") {
            setAnchor(null);
        }
    };

    // Aperçu : glissé à la souris / au doigt, ou sélection au clavier
    const preview: Rect | null = drag && drag.from !== drag.to ? rectBetween(drag.from, drag.to, width)
        : anchor !== null && focused ? rectBetween(anchor, cursor, width) : null;

    return (
        <div className="shikaku-board" tabIndex={0} role="application"
             aria-label="Plateau : Entrée pour commencer puis poser un rectangle, Suppr pour l'effacer"
             onKeyDown={onKeyDown} onFocus={() => setFocused(true)} onBlur={() => {
            setFocused(false);
            setAnchor(null);
        }}>
            <svg viewBox={`-1 -1 ${width * CELL + 2} ${height * CELL + 2}`}
                 onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
                 onPointerCancel={() => setDrag(null)}>
                {/* Traits fins de la grille */}
                {Array.from({length: width - 1}, (_, c) => (
                    <line key={`c${c}`} x1={(c + 1) * CELL} y1={0} x2={(c + 1) * CELL} y2={height * CELL} className="shikaku-gridline"/>
                ))}
                {Array.from({length: height - 1}, (_, r) => (
                    <line key={`r${r}`} x1={0} y1={(r + 1) * CELL} x2={width * CELL} y2={(r + 1) * CELL} className="shikaku-gridline"/>
                ))}

                {/* Rectangles tracés */}
                {rects.map((rect, k) => {
                    const [r, c, h, w] = rect;
                    const valid = analysis.statuses[k] === "valid";
                    const fill = valid ? rectColor(analysis.clueOf[k]!)
                        : showErrors ? "rgba(248, 113, 113, 0.3)" : "rgba(148, 163, 184, 0.22)";
                    return (
                        <rect key={`${k}-${rect.join(",")}`} x={c * CELL + 0.6} y={r * CELL + 0.6}
                              width={w * CELL - 1.2} height={h * CELL - 1.2} rx={1.2} fill={fill}
                              className={`shikaku-rect ${k < hintCount ? "hint" : ""}`}/>
                    );
                })}

                {/* Aperçu du rectangle en cours, avec son aire */}
                {preview && (
                    <g className="shikaku-preview">
                        <rect x={preview[1] * CELL + 0.6} y={preview[0] * CELL + 0.6}
                              width={preview[3] * CELL - 1.2} height={preview[2] * CELL - 1.2} rx={1.2}/>
                        <text x={(preview[1] + preview[3]) * CELL - 1.5} y={(preview[0] + preview[2]) * CELL - 1.5}>
                            {preview[2] * preview[3]}
                        </text>
                    </g>
                )}

                <rect x={0} y={0} width={width * CELL} height={height * CELL} className="shikaku-frame"/>

                {/* Case active au clavier */}
                {focused && (
                    <rect x={(cursor % width) * CELL + 1} y={Math.floor(cursor / width) * CELL + 1}
                          width={CELL - 2} height={CELL - 2} className="shikaku-cursor"/>
                )}

                {/* Nombres */}
                {clues.map(clue => (
                    <text key={clue.cell} x={(clue.cell % width + 0.5) * CELL} y={(Math.floor(clue.cell / width) + 0.5) * CELL}
                          className="shikaku-clue">
                        {clue.area}
                    </text>
                ))}
            </svg>
        </div>
    );
}
