import React from "react";

/**
 * Met le focus sur la cellule d'index targetIndex dans la grille.
 * Sélectionne tout le contenu de la cellule.
 *
 * @param inputsRef Référence vers le tableau des inputs de la grille
 * @param targetIndex Index de la cellule à cibler
 */
export function focusCell(inputsRef: React.RefObject<HTMLInputElement[]>, targetIndex: number) {
    const el = inputsRef.current?.[targetIndex];
    if (!el) return;
    el.focus();
    try {
        el.setSelectionRange(0, el.value.length);
    } catch {
        // certains types/navigateurs peuvent lever, on ignore
    }
}

