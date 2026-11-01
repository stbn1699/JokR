// Calculs sur les positions d'une grille carrée (index = ligne * size + colonne)

export type Direction = "left" | "right" | "up" | "down";

/**
 * true si b est dans la même ligne ou colonne que a (a exclu).
 * Avec `blockSize` (3 pour le Sudoku), compte aussi le même bloc blockSize×blockSize.
 */
export function isPeer(a: number, b: number, size = 9, blockSize?: number): boolean {
    if (a === b) return false;
    const [ra, ca] = [Math.floor(a / size), a % size];
    const [rb, cb] = [Math.floor(b / size), b % size];
    if (ra === rb || ca === cb) return true;
    if (!blockSize) return false;
    return Math.floor(ra / blockSize) === Math.floor(rb / blockSize)
        && Math.floor(ca / blockSize) === Math.floor(cb / blockSize);
}

// Case voisine dans une direction, en revenant au début de la ligne / colonne au bord
function step(i: number, direction: Direction, size: number): number {
    const r = Math.floor(i / size);
    const c = i % size;
    switch (direction) {
        case "left":
            return r * size + (c + size - 1) % size;
        case "right":
            return r * size + (c + 1) % size;
        case "up":
            return ((r + size - 1) % size) * size + c;
        case "down":
            return ((r + 1) % size) * size + c;
    }
}

/**
 * Prochaine case modifiable dans une direction (en sautant les cases données),
 * en restant sur la même ligne ou colonne. null s'il n'y en a pas d'autre.
 */
export function nextEditableIndex(
    from: number,
    direction: Direction,
    isEditable: (i: number) => boolean,
    size = 9,
): number | null {
    let i = from;
    for (let n = 0; n < size - 1; n++) {
        i = step(i, direction, size);
        if (isEditable(i)) return i;
    }
    return null;
}
