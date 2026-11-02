import {type CSSProperties, type KeyboardEvent, type PointerEvent, useMemo, useRef} from "react";
import {FaCrown, FaTimes} from "react-icons/fa";
import type {QueensPuzzle} from "../../Models/queens.model.ts";
import {CROSS, EMPTY, type Mark, QUEEN, regionBorders} from "./queensRules.ts";

// Couleurs des zones (pastel, texte sombre lisible dessus)
const REGION_COLORS = [
    "#f4a582", "#92c5de", "#f6d55c", "#a6d96a", "#c2a5cf",
    "#f4b6c2", "#80cdc1", "#fdb863", "#b8b8e8", "#d9c39a",
];

// Cases traversées en allant de la case a à la case b (b comprise, a non), en ligne droite
function cellsBetween(a: number, b: number, size: number): number[] {
    const [ra, ca, rb, cb] = [Math.floor(a / size), a % size, Math.floor(b / size), b % size];
    const steps = Math.max(Math.abs(rb - ra), Math.abs(cb - ca));
    const out: number[] = [];
    for (let k = 1; k <= steps; k++) {
        const r = Math.round(ra + ((rb - ra) * k) / steps), c = Math.round(ca + ((cb - ca) * k) / steps);
        const cell = r * size + c;
        if (!out.includes(cell)) out.push(cell);
    }
    return out;
}

const ARROWS: Record<string, [number, number]> = {ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1]};

type QueensBoardProps = {
    puzzle: QueensPuzzle;
    marks: Mark[];
    isHint: (i: number) => boolean;
    disabled: boolean;
    onCycle: (i: number) => void;
    onSetMark: (i: number, mark: Mark) => void;
    // Glissé : une croix sur chaque case vide traversée
    onCrossIfEmpty: (i: number) => void;
    // Dames en conflit (option « Montrer les erreurs »), null si désactivé
    errors: Set<number> | null;
    // Croix automatiques (option), null si désactivé
    autoCrosses: Set<number> | null;
};

/**
 * Plateau du Queens : une couleur par zone, traits épais entre les zones.
 * - Un appui : vide → croix → dame → vide (un double appui sur une case vide pose donc une dame)
 * - Glisser sur plusieurs cases : une croix sur chaque case vide traversée
 * - Clavier : flèches pour se déplacer, Espace / Entrée pour faire défiler, X croix, D dame, ⌫ vider
 */
export default function QueensBoard({puzzle, marks, isHint, disabled, onCycle, onSetMark, onCrossIfEmpty, errors, autoCrosses}: QueensBoardProps) {
    const {size, regions} = puzzle;
    const borders = useMemo(() => regions.map((_, i) => regionBorders(i, puzzle)), [regions, puzzle]);
    const cells = useRef<(HTMLButtonElement | null)[]>([]);
    // Glissé en cours : case de départ, dernière case traversée, et s'il a bougé
    const drag = useRef<{ start: number; last: number; moved: boolean } | null>(null);

    const cellFromPoint = (x: number, y: number): number | null => {
        const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-cell]");
        return el ? Number(el.dataset.cell) : null;
    };

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        if (disabled) return;
        const cell = cellFromPoint(e.clientX, e.clientY);
        if (cell === null) return;
        drag.current = {start: cell, last: cell, moved: false};
    };

    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        const current = drag.current;
        if (!current) return;
        const cell = cellFromPoint(e.clientX, e.clientY);
        if (cell === null || cell === current.last) return;
        if (!current.moved) {
            current.moved = true;
            onCrossIfEmpty(current.start);
        }
        // Un glissé rapide saute des cases : on prend toutes celles entre la précédente et celle-ci
        for (const k of cellsBetween(current.last, cell, size)) onCrossIfEmpty(k);
        current.last = cell;
    };

    const onPointerUp = () => {
        const current = drag.current;
        drag.current = null;
        if (current && !current.moved) onCycle(current.start);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const move = ARROWS[e.key];
        if (move) {
            e.preventDefault();
            const r = Math.min(size - 1, Math.max(0, Math.floor(i / size) + move[0]));
            const c = Math.min(size - 1, Math.max(0, (i % size) + move[1]));
            cells.current[r * size + c]?.focus();
            return;
        }
        const key = e.key.toLowerCase();
        if (key === " " || key === "enter") {
            e.preventDefault();
            onCycle(i);
        } else if (key === "x") {
            e.preventDefault();
            onSetMark(i, CROSS);
        } else if (key === "d" || key === "q") {
            e.preventDefault();
            onSetMark(i, QUEEN);
        } else if (key === "backspace" || key === "delete") {
            e.preventDefault();
            onSetMark(i, EMPTY);
        }
    };

    return (
        <div className="queens-grid" style={{"--size": size} as CSSProperties}
             onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
             onPointerCancel={() => (drag.current = null)} onPointerLeave={() => (drag.current = null)}>
            {marks.map((mark, i) => {
                const b = borders[i]!;
                const hint = isHint(i);
                const classes = [
                    "queens-cell",
                    b.top ? "b-top" : "", b.right ? "b-right" : "", b.bottom ? "b-bottom" : "", b.left ? "b-left" : "",
                    hint ? "hint" : "",
                    errors?.has(i) ? "conflict" : "",
                ];
                const label = `Ligne ${Math.floor(i / size) + 1}, colonne ${i % size + 1}`
                    + (mark === QUEEN ? ", dame" : mark === CROSS ? ", croix" : "");
                return (
                    <button
                        key={i}
                        ref={el => {
                            cells.current[i] = el;
                        }}
                        type="button"
                        data-cell={i}
                        className={classes.join(" ")}
                        style={{background: REGION_COLORS[regions[i]! % REGION_COLORS.length]}}
                        disabled={disabled}
                        aria-label={label}
                        onKeyDown={e => onKeyDown(e, i)}
                        // Le clic est géré par le glissé (appui sans bouger), pas par onClick
                        onClick={e => e.preventDefault()}
                    >
                        {mark === QUEEN && <FaCrown aria-hidden className="queens-queen"/>}
                        {mark === CROSS && <FaTimes aria-hidden className="queens-cross"/>}
                        {mark === EMPTY && autoCrosses?.has(i) && <FaTimes aria-hidden className="queens-cross auto"/>}
                    </button>
                );
            })}
        </div>
    );
}
