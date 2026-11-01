import {type CSSProperties, type KeyboardEvent, useEffect, useMemo, useRef} from "react";
import type {RikudoCell} from "../../Models/rikudo.model.ts";
import {type HexBoard, type HexDirection, nextHexCell, pathRuns} from "./rikudoRules.ts";

const ARROWS: Record<string, HexDirection> = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down",
};

// Délai pour taper un nombre à deux chiffres (ex : 2 puis 7 → 27)
const TYPING_DELAY_MS = 1200;
const SQRT3 = Math.sqrt(3);

// Sommets d'un hexagone "pointe en haut" de rayon `size` centré en (x, y), pour un <polygon> SVG
const hexPoints = (x: number, y: number, size: number) => Array.from({length: 6}, (_, k) => {
    const angle = (Math.PI / 3) * k - Math.PI / 2;
    return `${(x + size * Math.cos(angle)).toFixed(3)},${(y + size * Math.sin(angle)).toFixed(3)}`;
}).join(" ");


type RikudoBoardProps = {
    board: HexBoard;
    values: RikudoCell[];
    links: [number, number][];
    isClue: (i: number) => boolean;
    // Nombre de cases déjà apparues (animation de génération)
    revealed: number;
    disabled: boolean;
    selectedCell: number | null;
    onSelectCell: (i: number | null) => void;
    // Nombre surligné depuis le panneau de gauche
    highlightNumber: number | null;
    onSetCell: (i: number, v: RikudoCell) => void;
    // Cases à afficher en rouge (option "Montrer les erreurs"), null si désactivé
    errors: Set<number> | null;
    // Case dont la saisie n'est pas finie (un 2e chiffre peut encore suivre) : ni erreur, ni trait
    pendingCell: number | null;
    onPendingChange: (cell: number | null) => void;
};

/**
 * Plateau de Rikudo en nid d'abeille.
 * - Les nombres donnés ne sont pas sélectionnables ; seules les cases à remplir sont des boutons.
 * - Clavier : chiffres pour écrire un nombre (deux chiffres à la suite pour 10 et plus),
 *   Retour arrière / Suppr pour vider, flèches pour se déplacer.
 * - La case sélectionnée éclaire ses voisines (où peuvent aller les nombres qui suivent et précèdent)
 *   et les cases des nombres juste avant et juste après le sien.
 * - Les points entre deux cases imposent que leurs nombres se suivent.
 */
export default function RikudoBoard(props: RikudoBoardProps) {
    const {board, values, links, isClue, revealed, disabled, selectedCell, highlightNumber} = props;
    const cells = useRef<(HTMLButtonElement | null)[]>([]);
    const typing = useRef<{ cell: number; text: string; at: number } | null>(null);
    const pendingTimer = useRef<number | null>(null);
    const {onPendingChange} = props;

    // Fin de saisie : la case est vérifiée normalement
    const settle = () => {
        if (pendingTimer.current !== null) window.clearTimeout(pendingTimer.current);
        pendingTimer.current = null;
        onPendingChange(null);
    };
    useEffect(() => () => {
        if (pendingTimer.current !== null) window.clearTimeout(pendingTimer.current);
    }, []);

    const position = (x: number, y: number) => ({
        left: `${((x + board.width / 2) / board.width) * 100}%`,
        top: `${((y + board.height / 2) / board.height) * 100}%`,
    });
    const hexWidth = (SQRT3 / board.width) * 100;
    const cellStyle = {
        width: `${hexWidth}%`,
        height: `${(2 / board.height) * 100}%`,
        fontSize: `${hexWidth * (board.size > 60 ? 0.38 : 0.42)}cqw`,
    };

    const selectedValue = selectedCell !== null ? values[selectedCell] : null;
    const complete = revealed >= values.length;
    const pendingCell = props.pendingCell;
    const runs = useMemo(() => {
        if (!complete) return [];
        const settled = pendingCell === null ? values : values.map((v, i) => (i === pendingCell ? null : v));
        return pathRuns(settled, board.neighbors);
    }, [complete, values, board, pendingCell]);
    // Cases du départ (1) et de l'arrivée (N), toujours données
    const endpoints = complete ? values.flatMap((v, c) => (v === 1 || v === board.size ? [c] : [])) : [];
    const isNeighborOfSelected = (i: number) => selectedCell !== null && board.neighbors[selectedCell]!.includes(i);

    const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        const direction = ARROWS[e.key];
        if (direction) {
            e.preventDefault();
            typing.current = null;
            settle();
            const target = nextHexCell(board, i, direction, k => !isClue(k));
            if (target !== null) cells.current[target]?.focus();
            return;
        }

        if (/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            const now = e.timeStamp;
            const previous = typing.current;
            let text = previous && previous.cell === i && now - previous.at < TYPING_DELAY_MS
                ? previous.text + e.key
                : e.key;
            // Nombre trop grand pour le plateau : on repart du dernier chiffre tapé
            if (Number(text) > board.size) text = e.key;
            typing.current = {cell: i, text, at: now};
            const value = Number(text);
            if (value >= 1) props.onSetCell(i, value);
            // Un 2e chiffre peut encore suivre (ex : 1 → 12) : on attend avant de vérifier la case
            if (value * 10 <= board.size) {
                if (pendingTimer.current !== null) window.clearTimeout(pendingTimer.current);
                onPendingChange(i);
                pendingTimer.current = window.setTimeout(settle, TYPING_DELAY_MS);
            } else {
                settle();
            }
        } else if (e.key === "Backspace" || e.key === "Delete" || e.key === " ") {
            e.preventDefault();
            typing.current = null;
            settle();
            props.onSetCell(i, null);
        }
    };

    return (
        <div className="rikudo-board" style={{aspectRatio: `${board.width} / ${board.height}`}}>
            {/* Case centrale vide */}
            <div className="rikudo-hole" style={{...cellStyle, ...position(0, 0)}} aria-hidden/>

            {values.map((value, i) => {
                const shown = i < revealed;
                const [x, y] = board.centers[i]!;
                const classes = [
                    "hex",
                    isNeighborOfSelected(i) ? "peer-highlight" : "",
                    shown && selectedValue !== null && selectedValue !== undefined && value !== null
                    && Math.abs(value - selectedValue) === 1 ? "chain-highlight" : "",
                    shown && highlightNumber !== null && value === highlightNumber ? "same-number-highlight" : "",
                    shown && props.errors?.has(i) ? "conflict" : "",
                ];
                const style = {...cellStyle, ...position(x, y)} as CSSProperties;

                if (isClue(i)) {
                    return (
                        <div key={i} className={[...classes, shown ? "prefilled" : ""].join(" ")} style={style}>
                            <span>{shown ? value : ""}</span>
                        </div>
                    );
                }

                return (
                    <button
                        key={i}
                        ref={el => {
                            cells.current[i] = el;
                        }}
                        type="button"
                        className={classes.join(" ")}
                        style={style}
                        disabled={disabled}
                        aria-label={value ? `Case ${i + 1} : ${value}` : `Case ${i + 1}, vide`}
                        onKeyDown={e => onKeyDown(e, i)}
                        onFocus={() => props.onSelectCell(i)}
                        onBlur={() => {
                            typing.current = null;
                            settle();
                            props.onSelectCell(null);
                        }}
                    >
                        <span>{value ?? ""}</span>
                    </button>
                );
            })}

            {/* Chemin tracé (nombres consécutifs voisins) et repères du départ et de l'arrivée */}
            <svg className="rikudo-overlay" viewBox={`${-board.width / 2} ${-board.height / 2} ${board.width} ${board.height}`}
                 aria-hidden>
                {endpoints.map(c => (
                    <polygon key={c} className="rikudo-endpoint" points={hexPoints(...board.centers[c]!, 0.68)}/>
                ))}
                {runs.map(run => (
                    <polyline key={`${run[0]}-${run.length}`} className="rikudo-path"
                              points={run.map(c => board.centers[c]!.map(n => n.toFixed(3)).join(",")).join(" ")}/>
                ))}
            </svg>

            {complete && links.map(([a, b]) => {
                const [x1, y1] = board.centers[a]!, [x2, y2] = board.centers[b]!;
                return (
                    <div key={`${a}-${b}`} className="rikudo-link" aria-hidden
                         style={{...position((x1 + x2) / 2, (y1 + y2) / 2), width: `${hexWidth * 0.26}%`}}/>
                );
            })}
        </div>
    );
}
