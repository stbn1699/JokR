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
            // wrap: si on est tout à gauche, on va tout à droite de la même ligne
            target = col > 0 ? idx - 1 : row * 9 + 8;
        } else if (key === "ArrowRight") {
            e.preventDefault();
            // wrap: si on est tout à droite, on va tout à gauche de la même ligne
            target = col < 8 ? idx + 1 : row * 9;
        } else if (key === "ArrowUp") {
            e.preventDefault();
            // wrap: si on est tout en haut, on va tout en bas dans la même colonne
            target = row > 0 ? idx - 9 : 8 * 9 + col;
        } else if (key === "ArrowDown") {
            e.preventDefault();
            // wrap: si on est tout en bas, on va tout en haut dans la même colonne
            target = row < 8 ? idx + 9 : col;
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

