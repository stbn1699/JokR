import {type CSSProperties, type KeyboardEvent, type PointerEvent, useRef} from "react";
import type {TracePuzzle} from "../../Models/trace.model.ts";
import {hasWall} from "./traceRules.ts";

type TraceBoardProps = {
    puzzle: TracePuzzle;
    path: number[];
    walls: Set<string>;
    disabled: boolean;
    // chemin complet et juste (couleur de victoire)
    solved: boolean;
    onBegin: () => void;
    onEnter: (cell: number) => void;
    onEnd: () => void;
    // un pas au clavier
    onStep: (cell: number) => void;
    // Tutoriel : cases dans l'ombre (toutes sauf `lit`) et case où avancer (qui pulse)
    guide?: { lit: Set<number> | null; target: number | null };
};

const ARROWS: Record<string, [number, number]> = {ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1]};

/**
 * Plateau du Tracé : cases, murs épais entre certaines voisines, numéros dans des pastilles, et le chemin dessiné
 * par-dessus (trait arrondi qui relie le centre des cases).
 * - Appuyer sur le bout du chemin (ou une case du chemin) puis glisser : le chemin suit le doigt ; revenir en
 *   arrière l'efface
 * - Appuyer sur une case voisine du bout : le chemin y avance
 * - Clavier : flèches pour avancer depuis le bout (ou reculer en revenant sur ses pas)
 */
export default function TraceBoard({puzzle, path, walls, disabled, solved, onBegin, onEnter, onEnd, onStep, guide}: TraceBoardProps) {
    const {size, numbers} = puzzle;
    const dragging = useRef(false);
    const valueAt = new Map(numbers.map(n => [n.cell, n.value]));
    const inPath = new Set(path);
    const end = path[path.length - 1];
    const last = Math.max(...numbers.map(n => n.value));

    const cellFromPoint = (x: number, y: number): number | null => {
        const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-cell]");
        return el ? Number(el.dataset.cell) : null;
    };

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        if (disabled) return;
        const cell = cellFromPoint(e.clientX, e.clientY);
        if (cell === null) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        dragging.current = true;
        onBegin();
        onEnter(cell);
    };

    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        if (!dragging.current) return;
        const cell = cellFromPoint(e.clientX, e.clientY);
        if (cell !== null) onEnter(cell);
    };

    const stop = () => {
        if (!dragging.current) return;
        dragging.current = false;
        onEnd();
    };

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        const arrow = ARROWS[e.key];
        if (!arrow || disabled || end === undefined) return;
        e.preventDefault();
        const r = Math.floor(end / size) + arrow[0], c = (end % size) + arrow[1];
        if (r < 0 || r >= size || c < 0 || c >= size) return;
        const target = r * size + c;
        // revenir sur la case d'avant : on recule
        onStep(path[path.length - 2] === target ? path[path.length - 2]! : target);
    };

    // centre d'une case, en unités de case (pour le tracé SVG)
    const center = (cell: number) => `${(cell % size) + 0.5},${Math.floor(cell / size) + 0.5}`;

    return (
        <div className={`trace-board ${solved ? "solved" : ""}`} style={{"--size": size} as CSSProperties}
             role="grid" aria-label="Grille du Tracé" tabIndex={0}
             onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stop} onPointerCancel={stop}
             onKeyDown={onKeyDown}>
            {Array.from({length: size * size}, (_, cell) => {
                const r = Math.floor(cell / size), c = cell % size;
                const classes = ["trace-cell",
                    inPath.has(cell) ? "on" : "",
                    r > 0 && hasWall(walls, cell, cell - size) ? "w-top" : "",
                    r < size - 1 && hasWall(walls, cell, cell + size) ? "w-bottom" : "",
                    c > 0 && hasWall(walls, cell, cell - 1) ? "w-left" : "",
                    c < size - 1 && hasWall(walls, cell, cell + 1) ? "w-right" : "",
                    guide && cell === guide.target ? "guide-target" : "",
                    guide && cell !== guide.target && guide.lit !== null && !guide.lit.has(cell) ? "veil-dark" : "",
                ].join(" ");
                return <div key={cell} className={classes} data-cell={cell} role="gridcell"
                            aria-label={valueAt.has(cell) ? `Numéro ${valueAt.get(cell)}` : undefined}/>;
            })}

            <svg className="trace-path" viewBox={`0 0 ${size} ${size}`} aria-hidden>
                {path.length > 1 && <polyline points={path.map(center).join(" ")}/>}
                {end !== undefined && !solved && <circle className="trace-head" cx={(end % size) + 0.5} cy={Math.floor(end / size) + 0.5} r={0.17}/>}
            </svg>

            {numbers.map(n => (
                <span key={n.cell} className={`trace-number ${inPath.has(n.cell) ? "reached" : ""} ${n.value === 1 || n.value === last ? "edge" : ""}`}
                      style={{left: `calc(${(n.cell % size) + 0.5} * var(--cell))`, top: `calc(${Math.floor(n.cell / size) + 0.5} * var(--cell))`}}>
                    {n.value}
                </span>
            ))}
        </div>
    );
}
