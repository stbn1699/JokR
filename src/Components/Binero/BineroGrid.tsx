import {type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent, useEffect, useRef} from "react";
import type {BineroCell} from "../../Models/bineroSettings.model.ts";
import {type Direction, isPeer, nextEditableIndex} from "../PuzzleUI/gridGeometry.ts";

const ARROWS: Record<string, Direction> = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down",
};

type BineroGridProps = {
    size: number;
    values: BineroCell[];
    isClue: (i: number) => boolean;
    // Nombre de cases déjà apparues (animation de génération)
    revealed: number;
    disabled: boolean;
    selectedCell: number | null;
    onSelectCell: (i: number | null) => void;
    // Chiffre surligné depuis le panneau de gauche
    highlightDigit: number | null;
    onSetCell: (i: number, v: BineroCell) => void;
    // Cases à afficher en rouge (option « Montrer les coups interdits »), null si désactivé
    errors: Set<number> | null;    // Tutoriel : case choisie d'avance (undefined : la grille ne s'en occupe pas) ; oneTap : un appui suffit pour la changer
    focusCell?: number | null;
    oneTap?: boolean;
};

/**
 * Grille de Binero.
 * - Les chiffres donnés ne sont pas sélectionnables ; seules les cases à remplir sont des boutons.
 * - Clavier : 0 / 1 pour remplir, Retour arrière / Suppr pour vider, flèches pour se déplacer
 *   (les chiffres donnés sont sautés).
 * - Souris / doigt : un 1er appui sélectionne la case, les suivants la font passer vide → 0 → 1 → vide.
 * - La case sélectionnée éclaircit sa ligne et sa colonne.
 */
export default function BineroGrid(props: BineroGridProps) {
    const {size, values, isClue, revealed, disabled, selectedCell, highlightDigit, focusCell} = props;
    const cells = useRef<(HTMLButtonElement | null)[]>([]);

    // Tutoriel : la case à remplir est choisie d'avance (focus : le clavier y écrit) ; null : plus aucune case choisie
    useEffect(() => {
        if (focusCell === undefined) return;
        const active = document.activeElement;
        if (focusCell === null) {
            if (active instanceof HTMLElement && cells.current.includes(active as HTMLButtonElement)) active.blur();
        } else if (cells.current[focusCell] !== active) {
            cells.current[focusCell]?.focus({preventScroll: true});
        }
    }, [focusCell, values]);
    // On note sur le bouton s'il avait déjà le focus au moment de l'appui
    // (si non, l'appui ne fait que sélectionner la case)
    const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
        e.currentTarget.dataset.wasSelected = String(document.activeElement === e.currentTarget);
    };

    const cycle = (e: MouseEvent<HTMLButtonElement>, i: number) => {
        if (!props.oneTap && e.currentTarget.dataset.wasSelected !== "true") return;
        const next: BineroCell = values[i] === null ? 0 : values[i] === 0 ? 1 : null;
        props.onSetCell(i, next);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        const direction = ARROWS[e.key];
        if (direction) {
            e.preventDefault();
            const target = nextEditableIndex(i, direction, k => !isClue(k), size);
            if (target !== null) cells.current[target]?.focus();
            return;
        }

        if (e.key === "0" || e.key === "1") {
            e.preventDefault();
            props.onSetCell(i, Number(e.key) as 0 | 1);
        } else if (e.key === "Backspace" || e.key === "Delete" || e.key === " ") {
            e.preventDefault();
            props.onSetCell(i, null);
        }
    };

    return (
        <div className="grid" style={{"--size": size} as CSSProperties}>
            {values.map((value, i) => {
                const shown = i < revealed;
                const classes = [
                    "cell",
                    // chaque valeur a sa couleur, pour lire les suites d'un coup d'œil
                    shown && value === 0 ? "zero" : shown && value === 1 ? "one" : "",
                    selectedCell !== null && isPeer(selectedCell, i, size) ? "peer-highlight" : "",
                    shown && highlightDigit !== null && value === highlightDigit ? "same-number-highlight" : "",
                    shown && props.errors?.has(i) ? "conflict" : "",
                ];

                if (isClue(i)) {
                    return (
                        <div key={i} className={[...classes, shown ? "prefilled" : ""].join(" ")}>
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
                        disabled={disabled}
                        aria-label={`Ligne ${Math.floor(i / size) + 1}, colonne ${i % size + 1}`}
                        onKeyDown={e => onKeyDown(e, i)}
                        onPointerDown={onPointerDown}
                        onClick={e => cycle(e, i)}
                        onFocus={() => props.onSelectCell(i)}
                        onBlur={() => props.onSelectCell(null)}
                    >
                        {value ?? ""}
                    </button>
                );
            })}
        </div>
    );
}
