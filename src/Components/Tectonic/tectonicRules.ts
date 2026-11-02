import type {TectonicCell, TectonicPuzzle} from "../../Models/tectonic.model.ts";

/*
 * Règles du Tectonic, côté navigateur : taille des zones, bordures à tracer et cases en erreur.
 * Une zone de n cases contient les nombres de 1 à n ; deux cases voisines (diagonales comprises)
 * n'ont jamais le même nombre.
 */

// Taille de chaque zone (index = numéro de zone)
export function regionSizes(regions: number[]): number[] {
    const sizes: number[] = [];
    for (const r of regions) sizes[r] = (sizes[r] ?? 0) + 1;
    return sizes;
}

// Les 8 cases autour de la case i
export function aroundCells(i: number, width: number, height: number): number[] {
    const r = Math.floor(i / width), c = i % width;
    const out: number[] = [];
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const rr = r + dr, cc = c + dc;
            if (rr >= 0 && rr < height && cc >= 0 && cc < width) out.push(rr * width + cc);
        }
    }
    return out;
}

// Bordures épaisses de la case i : côtés qui touchent une autre zone (le bord de la grille a déjà son cadre)
export function regionBorders(i: number, puzzle: TectonicPuzzle) {
    const {width, height, regions} = puzzle;
    const r = Math.floor(i / width), c = i % width;
    const differs = (rr: number, cc: number) =>
        rr >= 0 && rr < height && cc >= 0 && cc < width && regions[rr * width + cc] !== regions[i];
    return {top: differs(r - 1, c), right: differs(r, c + 1), bottom: differs(r + 1, c), left: differs(r, c - 1)};
}

/**
 * Cases en erreur (option « Montrer les erreurs ») :
 * - nombre plus grand que la taille de sa zone
 * - même nombre deux fois dans une zone
 * - même nombre dans deux cases voisines (diagonales comprises)
 */
export function tectonicConflicts(values: TectonicCell[], puzzle: TectonicPuzzle | null): Set<number> {
    const errors = new Set<number>();
    if (!puzzle) return errors;
    const {width, height, regions} = puzzle;
    const sizes = regionSizes(regions);
    const byRegionValue = new Map<string, number[]>();

    values.forEach((v, i) => {
        if (v === null) return;
        if (v < 1 || v > sizes[regions[i]!]!) errors.add(i);
        const key = `${regions[i]}:${v}`;
        byRegionValue.set(key, [...(byRegionValue.get(key) ?? []), i]);
        for (const n of aroundCells(i, width, height)) {
            if (values[n] === v) {
                errors.add(i);
                errors.add(n);
            }
        }
    });
    for (const cells of byRegionValue.values()) {
        if (cells.length > 1) cells.forEach(i => errors.add(i));
    }
    return errors;
}

/*
 * Notes au crayon : pour chaque case, un masque de bits (bit n = le nombre n est noté).
 */
export const hasNote = (mask: number, digit: number) => (mask & (1 << digit)) !== 0;
export const toggleNote = (mask: number, digit: number) => mask ^ (1 << digit);

/**
 * Un nombre vient d'être posé (ou effacé, digit = null) dans la case `index` :
 * ses notes disparaissent, et ce nombre est retiré des notes de sa zone et des 8 cases autour.
 */
export function notesAfterPlacing(notes: number[], index: number, digit: number | null, puzzle: TectonicPuzzle): number[] {
    const {width, height, regions} = puzzle;
    const around = new Set(aroundCells(index, width, height));
    return notes.map((mask, i) => {
        if (i === index) return 0;
        if (digit !== null && (regions[i] === regions[index] || around.has(i))) return mask & ~(1 << digit);
        return mask;
    });
}

// Combien de fois chaque nombre apparaît dans une grille complète (une fois par zone assez grande)
export function expectedCounts(puzzle: TectonicPuzzle | null): Record<number, number> {
    const counts: Record<number, number> = {};
    if (!puzzle) return counts;
    for (const size of regionSizes(puzzle.regions)) {
        for (let v = 1; v <= size; v++) counts[v] = (counts[v] ?? 0) + 1;
    }
    return counts;
}
