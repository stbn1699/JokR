// Règles du Démineur côté navigateur : voisines d'une case et clic sur un chiffre

export function neighbours(cell: number, size: number): number[] {
    const row = Math.floor(cell / size), col = cell % size;
    const result: number[] = [];
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            const [r, c] = [row + dr, col + dc];
            if ((dr || dc) && r >= 0 && c >= 0 && r < size && c < size) result.push(r * size + c);
        }
    }
    return result;
}

export type ClickPlan =
    | { kind: "reveal"; cells: number[] }
    // chiffre pas encore entouré du bon nombre de drapeaux : on montre ses cases encore cachées
    | { kind: "highlight"; cells: number[] }
    | { kind: "none" };

/*
 * Clic sur une case :
 * - case cachée sans drapeau : on la libère
 * - chiffre entouré d'autant de drapeaux : on libère ses autres voisines cachées
 * - chiffre qui n'a pas le bon nombre de drapeaux : on met ses cases cachées en évidence
 */
export function planClick(cell: number, size: number, revealed: ReadonlyMap<number, number>, flags: ReadonlySet<number>): ClickPlan {
    if (flags.has(cell)) return {kind: "none"};
    const count = revealed.get(cell);
    if (count === undefined) return {kind: "reveal", cells: [cell]};
    if (count === 0) return {kind: "none"};

    const hidden = neighbours(cell, size).filter(n => !revealed.has(n));
    const flagged = hidden.filter(n => flags.has(n)).length;
    const toOpen = hidden.filter(n => !flags.has(n));
    if (toOpen.length === 0) return {kind: "none"};
    return flagged === count ? {kind: "reveal", cells: toOpen} : {kind: "highlight", cells: toOpen};
}
