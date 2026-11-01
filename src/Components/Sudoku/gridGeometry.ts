// Calculs sur les positions de la grille (index = ligne * 9 + colonne)

export type Direction = "left" | "right" | "up" | "down";

const rowOf = (i: number) => Math.floor(i / 9);
const colOf = (i: number) => i % 9;
const blockOf = (i: number) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

// true si b est dans la même ligne, colonne ou bloc 3×3 que a (a exclu)
export function isPeer(a: number, b: number): boolean {
    if (a === b) return false;
    return rowOf(a) === rowOf(b) || colOf(a) === colOf(b) || blockOf(a) === blockOf(b);
}

// Case voisine dans une direction, en revenant au début de la ligne / colonne au bord
function step(i: number, direction: Direction): number {
    const r = rowOf(i);
    const c = colOf(i);
    switch (direction) {
        case "left":
            return r * 9 + (c + 8) % 9;
        case "right":
            return r * 9 + (c + 1) % 9;
        case "up":
            return ((r + 8) % 9) * 9 + c;
        case "down":
            return ((r + 1) % 9) * 9 + c;
    }
}

/**
 * Prochaine case modifiable dans une direction (en sautant les indices),
 * en restant sur la même ligne ou colonne. null s'il n'y en a pas d'autre.
 */
export function nextEditableIndex(from: number, direction: Direction, isEditable: (i: number) => boolean): number | null {
    let i = from;
    for (let n = 0; n < 8; n++) {
        i = step(i, direction);
        if (isEditable(i)) return i;
    }
    return null;
}
