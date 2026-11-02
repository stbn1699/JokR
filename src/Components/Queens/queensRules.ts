import type {QueensPuzzle} from "../../Models/queens.model.ts";

/*
 * Règles du Queens, côté navigateur. Grille aplatie (index = ligne * N + colonne).
 * Contenu d'une case : EMPTY, CROSS (le joueur a noté qu'il n'y a pas de dame) ou QUEEN.
 */

export const EMPTY = 0;
export const CROSS = 1;
export const QUEEN = 2;
export type Mark = typeof EMPTY | typeof CROSS | typeof QUEEN;

// Appui sur une case : vide → croix → dame → vide
export const nextMark = (mark: Mark): Mark => (mark === EMPTY ? CROSS : mark === CROSS ? QUEEN : EMPTY);

// Côtés d'une case qui touchent une autre zone (traits épais, sauf au bord de la grille qui a son cadre)
export function regionBorders(i: number, puzzle: QueensPuzzle) {
    const {size, regions} = puzzle;
    const r = Math.floor(i / size), c = i % size;
    const differs = (rr: number, cc: number) =>
        rr >= 0 && rr < size && cc >= 0 && cc < size && regions[rr * size + cc] !== regions[i];
    return {top: differs(r - 1, c), right: differs(r, c + 1), bottom: differs(r + 1, c), left: differs(r, c - 1)};
}

/**
 * Dames en conflit (option « Montrer les erreurs ») : deux dames sur la même ligne, la même colonne,
 * dans la même zone, ou qui se touchent (diagonales comprises).
 */
export function queensConflicts(marks: Mark[], puzzle: QueensPuzzle | null): Set<number> {
    const errors = new Set<number>();
    if (!puzzle) return errors;
    const {size, regions} = puzzle;
    const queens = marks.flatMap((m, i) => (m === QUEEN ? [i] : []));
    for (const a of queens) {
        for (const b of queens) {
            if (a >= b) continue;
            const ra = Math.floor(a / size), ca = a % size, rb = Math.floor(b / size), cb = b % size;
            const touching = Math.abs(ra - rb) <= 1 && Math.abs(ca - cb) <= 1;
            if (ra === rb || ca === cb || regions[a] === regions[b] || touching) {
                errors.add(a);
                errors.add(b);
            }
        }
    }
    return errors;
}

/**
 * Croix automatiques (option) : cases vides où aucune dame ne peut aller à cause des dames posées,
 * c'est-à-dire sur la ligne, la colonne ou dans la zone d'une dame, ou juste à côté d'elle.
 * Simple affichage : elles disparaissent quand la dame est retirée.
 */
export function autoCrossCells(marks: Mark[], puzzle: QueensPuzzle | null): Set<number> {
    const cells = new Set<number>();
    if (!puzzle) return cells;
    const {size, regions} = puzzle;
    const queens = marks.flatMap((m, i) => (m === QUEEN ? [i] : []));
    marks.forEach((mark, i) => {
        if (mark !== EMPTY) return;
        const r = Math.floor(i / size), c = i % size;
        if (queens.some(q => {
            const rq = Math.floor(q / size), cq = q % size;
            return rq === r || cq === c || regions[q] === regions[i] || (Math.abs(rq - r) <= 1 && Math.abs(cq - c) <= 1);
        })) cells.add(i);
    });
    return cells;
}

// Cases des dames si la grille est résolue (N dames, aucun conflit), sinon null
export function queensSolution(marks: Mark[], puzzle: QueensPuzzle | null): number[] | null {
    if (!puzzle) return null;
    const queens = marks.flatMap((m, i) => (m === QUEEN ? [i] : []));
    if (queens.length !== puzzle.size) return null;
    return queensConflicts(marks, puzzle).size === 0 ? queens : null;
}
