import {isPeer} from "../PuzzleUI/gridGeometry.ts";

/**
 * Convertit les 81 valeurs saisies (ligne par ligne) en grille 9×9.
 * Retourne null si une case est vide ou ne contient pas un chiffre de 1 à 9.
 */
export function parseGridValues(values: string[]): number[][] | null {
    if (values.length !== 81) return null;

    const grid: number[][] = [];
    for (let r = 0; r < 9; r++) {
        const row: number[] = [];
        for (let c = 0; c < 9; c++) {
            const n = Number(values[r * 9 + c]);
            if (!Number.isInteger(n) || n < 1 || n > 9) return null;
            row.push(n);
        }
        grid.push(row);
    }
    return grid;
}

/**
 * Compte combien de fois chaque chiffre apparaît dans la grille.
 * Retourne un tableau de 10 cases : counts[n] = nombre de n (l'index 0 n'est pas utilisé).
 */
export function countDigits(values: string[]): number[] {
    const counts = Array<number>(10).fill(0);
    for (const v of values) {
        const n = Number(v);
        if (Number.isInteger(n) && n >= 1 && n <= 9) counts[n]!++;
    }
    return counts;
}

/**
 * Cases en conflit : un chiffre présent plusieurs fois dans la même ligne, colonne ou bloc 3×3.
 * Ne dit rien de la solution : seulement ce qui contredit déjà les règles.
 */
export function sudokuConflicts(values: string[]): Set<number> {
    const conflicts = new Set<number>();
    const groups: number[][] = [];
    for (let k = 0; k < 9; k++) {
        groups.push(Array.from({length: 9}, (_, i) => k * 9 + i)); // ligne
        groups.push(Array.from({length: 9}, (_, i) => i * 9 + k)); // colonne
        const r0 = Math.floor(k / 3) * 3, c0 = (k % 3) * 3;
        groups.push(Array.from({length: 9}, (_, i) => (r0 + Math.floor(i / 3)) * 9 + c0 + (i % 3))); // bloc
    }
    for (const group of groups) {
        const byDigit = new Map<string, number[]>();
        for (const idx of group) {
            const v = values[idx];
            if (!v) continue;
            byDigit.set(v, [...(byDigit.get(v) ?? []), idx]);
        }
        for (const cells of byDigit.values()) {
            if (cells.length > 1) cells.forEach(c => conflicts.add(c));
        }
    }
    return conflicts;
}

/*
 * Notes au crayon : pour chaque case, un masque de bits (bit n = le chiffre n est noté).
 */
export const hasNote = (mask: number, digit: number) => (mask & (1 << digit)) !== 0;
export const toggleNote = (mask: number, digit: number) => mask ^ (1 << digit);

/**
 * Un chiffre vient d'être posé (ou effacé, digit = null) dans la case `index` :
 * ses notes disparaissent, et ce chiffre est retiré des notes de sa ligne, sa colonne et son bloc.
 */
export function notesAfterPlacing(notes: number[], index: number, digit: number | null): number[] {
    return notes.map((mask, i) => {
        if (i === index) return 0;
        if (digit !== null && isPeer(index, i, 9, 3)) return mask & ~(1 << digit);
        return mask;
    });
}
