import React from "react";
import { focusCell } from "./focusCell";
import {type Direction, nextEditableIndex} from "./gridGeometry";

const ARROWS: Record<string, Direction> = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down",
};

const forbiddenKeys = new Set(["e", "E", "+", "-"]);

/**
 * Gère la navigation au clavier dans la grille Sudoku.
 * Flèches : passe à la case modifiable suivante dans la direction (les indices sont sautés,
 * on revient au début de la ligne / colonne au bord).
 * Chiffres 1-9 pour remplir une cellule, 0 pour la vider.
 * Empêche les touches interdites (e, +, -).
 *
 * @param e Événement clavier
 * @param inputsRef Référence vers le tableau des inputs de la grille
 */
export function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    inputsRef: React.RefObject<HTMLInputElement[]>
) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const key = e.key;
    const el = e.currentTarget as HTMLInputElement;
    const idxAttr = el.dataset.index;
    const idx = idxAttr ? parseInt(idxAttr, 10) : -1;

    const direction = ARROWS[key];
    if (idx >= 0 && direction) {
        e.preventDefault();
        // On saute les indices : seules les cases modifiables peuvent être sélectionnées
        const isEditable = (i: number) => {
            const cell = inputsRef.current?.[i];
            return !!cell && !cell.readOnly && !cell.disabled;
        };
        const target = nextEditableIndex(idx, direction, isEditable);
        if (target !== null) {
            focusCell(inputsRef, target);
            return;
        }
    }

    if (forbiddenKeys.has(key)) {
        e.preventDefault();
        return;
    }

    if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        el.value = key === "0" ? "" : key;
        // La valeur est écrite à la main (touche bloquée) : on signale le changement à React
        // pour mettre à jour la surbrillance et le compteur de chiffres
        el.dispatchEvent(new Event("input", {bubbles: true}));
    }
}

