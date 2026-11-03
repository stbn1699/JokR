import {type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent, useMemo, useRef} from "react";
import type {TectonicCell, TectonicPuzzle} from "../../Models/tectonic.model.ts";
import {type Direction, nextEditableIndex} from "../PuzzleUI/gridGeometry.ts";
import {hasNote, regionBorders, regionSizes} from "./tectonicRules.ts";
import {REGION_COLORS, regionColorIndices} from "../PuzzleUI/regionColors.ts";

const ARROWS: Record<string, Direction> = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down",
};

type TectonicGridProps = {
    puzzle: TectonicPuzzle;
    values: TectonicCell[];
    isClue: (i: number) => boolean;
    // Nombre de cases déjà apparues (animation de génération)
    revealed: number;
    disabled: boolean;
    selectedCell: number | null;
    onSelectCell: (i: number | null) => void;
    // Nombre surligné depuis le panneau de gauche
    highlightDigit: number | null;
    onSetCell: (i: number, v: TectonicCell) => void;
    // Cases à afficher en rouge (option "Montrer les erreurs"), null si désactivé
    errors: Set<number> | null;
    // Notes au crayon (masque de bits par case) et mode notes
    notes: number[];
    notesMode: boolean;
    onToggleNote: (i: number, digit: number) => void;
};

const NOTE_DIGITS = [1, 2, 3, 4, 5];

/**
 * Grille de Tectonic : une couleur par zone (comme le Queens, deux zones voisines jamais pareilles),
 * traits épais entre les zones.
 * - Les nombres donnés ne sont pas sélectionnables ; seules les cases à remplir sont des boutons.
 * - Clavier : 1 à 5 pour remplir, Retour arrière / Suppr pour vider, flèches pour se déplacer
 *   (les nombres donnés sont sautés).
 * - Souris / doigt : un 1er appui sélectionne la case, les suivants font défiler vide → 1 → … → taille de la zone → vide.
 * - La case sélectionnée éclaircit sa zone.
 * - Mode notes : un nombre tapé ajoute / retire une note au crayon au lieu de remplir la case
 *   (et un appui sur la case ne fait que la sélectionner).
 */
export default function TectonicGrid(props: TectonicGridProps) {
    const {puzzle, values, isClue, revealed, disabled, selectedCell, highlightDigit} = props;
    const {width, regions} = puzzle;
    const sizes = useMemo(() => regionSizes(regions), [regions]);
    const borders = useMemo(() => regions.map((_, i) => regionBorders(i, puzzle)), [regions, puzzle]);
    const colors = useMemo(() => regionColorIndices(regions, width), [regions, width]);
    const cells = useRef<(HTMLButtonElement | null)[]>([]);

    // On note sur le bouton s'il avait déjà le focus au moment de l'appui
    // (si non, l'appui ne fait que sélectionner la case)
    const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
        e.currentTarget.dataset.wasSelected = String(document.activeElement === e.currentTarget);
    };

    const cycle = (e: MouseEvent<HTMLButtonElement>, i: number) => {
        if (e.currentTarget.dataset.wasSelected !== "true" || props.notesMode) return;
        const max = sizes[regions[i]!] ?? 1;
        const current = values[i] ?? 0;
        props.onSetCell(i, current >= max ? null : current + 1);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        const direction = ARROWS[e.key];
        if (direction) {
            e.preventDefault();
            const target = nextEditableIndex(i, direction, k => !isClue(k), width);
            if (target !== null) cells.current[target]?.focus();
            return;
        }

        if (/^[1-5]$/.test(e.key)) {
            e.preventDefault();
            if (props.notesMode) props.onToggleNote(i, Number(e.key));
            else props.onSetCell(i, Number(e.key));
        } else if (e.key === "Backspace" || e.key === "Delete" || e.key === " " || e.key === "0") {
            e.preventDefault();
            props.onSetCell(i, null);
        }
    };

    const selectedRegion = selectedCell !== null ? regions[selectedCell] : null;

    return (
        <div className={`grid ${props.notesMode ? "notes-mode" : ""}`} style={{"--size": width} as CSSProperties}>
            {values.map((value, i) => {
                const shown = i < revealed;
                const b = borders[i]!;
                const style = {"--region": REGION_COLORS[colors[regions[i]!]!]} as CSSProperties;
                const classes = [
                    "cell",
                    b.top ? "b-top" : "", b.right ? "b-right" : "", b.bottom ? "b-bottom" : "", b.left ? "b-left" : "",
                    selectedRegion !== null && regions[i] === selectedRegion ? "peer-highlight" : "",
                    shown && highlightDigit !== null && value === highlightDigit ? "same-number-highlight" : "",
                    shown && props.errors?.has(i) ? "conflict" : "",
                ];

                if (isClue(i)) {
                    return (
                        <div key={i} className={[...classes, shown ? "prefilled" : ""].join(" ")} style={style}>
                            {shown ? value : ""}
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
                        aria-label={`Ligne ${Math.floor(i / width) + 1}, colonne ${i % width + 1}, zone de ${sizes[regions[i]!]} cases`}
                        onKeyDown={e => onKeyDown(e, i)}
                        onPointerDown={onPointerDown}
                        onClick={e => cycle(e, i)}
                        onFocus={() => props.onSelectCell(i)}
                        onBlur={() => props.onSelectCell(null)}
                    >
                        {value ?? (props.notes[i] ? (
                            <span className="notes" aria-hidden>
                                {NOTE_DIGITS.map(d => <span key={d}>{hasNote(props.notes[i]!, d) ? d : ""}</span>)}
                            </span>
                        ) : "")}
                    </button>
                );
            })}
        </div>
    );
}
