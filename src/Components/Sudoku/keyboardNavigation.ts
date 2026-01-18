import React from "react";
import { focusCell } from "./focusCell";

const forbiddenKeys = new Set(["e", "E", "+", "-"]);

/**
 * Gère la navigation au clavier dans la grille Sudoku.
 * Flèches directionnelles pour naviguer entre les cellules.
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

    if (idx >= 0) {
        const row = Math.floor(idx / 9);
        const col = idx % 9;
        let target = -1;

        if (key === "ArrowLeft") {
            e.preventDefault();
            if (col > 0) target = idx - 1;
        } else if (key === "ArrowRight") {
            e.preventDefault();
            if (col < 8) target = idx + 1;
        } else if (key === "ArrowUp") {
            e.preventDefault();
            if (row > 0) target = idx - 9;
        } else if (key === "ArrowDown") {
            e.preventDefault();
            if (row < 8) target = idx + 9;
        }

        if (target >= 0) {
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
        if (key === "0") {
            el.value = "";
        } else {
            el.value = key;
        }
    }
}

