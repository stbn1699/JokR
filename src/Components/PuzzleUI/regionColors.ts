// Couleurs des zones (pastel, texte sombre lisible dessus) : Queens et Tectonic
export const REGION_COLORS = [
    "#f4a582", "#92c5de", "#f6d55c", "#a6d96a", "#c2a5cf",
    "#f4b6c2", "#80cdc1", "#fdb863", "#b8b8e8", "#d9c39a",
];

/**
 * Couleur de chaque zone (indice dans REGION_COLORS), deux zones voisines n'ont jamais la même.
 * Pour les grilles qui ont plus de zones que de couleurs (Tectonic) : on prend, parmi les couleurs
 * libres, la moins utilisée jusque-là, pour bien les répartir.
 * `regions[i]` est la zone de la case i, sur une grille de `width` colonnes.
 */
export function regionColorIndices(regions: number[], width: number): number[] {
    const count = Math.max(-1, ...regions) + 1;
    const height = Math.ceil(regions.length / width);
    const neighbours = Array.from({length: count}, () => new Set<number>());
    regions.forEach((r, i) => {
        const row = Math.floor(i / width), col = i % width;
        const right = col + 1 < width ? regions[i + 1] : undefined;
        const down = row + 1 < height ? regions[i + width] : undefined;
        for (const n of [right, down]) {
            if (n !== undefined && n !== r) {
                neighbours[r]!.add(n);
                neighbours[n]!.add(r);
            }
        }
    });

    const colors: number[] = new Array(count).fill(-1);
    const used = new Array(REGION_COLORS.length).fill(0);
    for (let r = 0; r < count; r++) {
        const taken = new Set([...neighbours[r]!].map(n => colors[n]));
        let best = -1;
        for (let c = 0; c < REGION_COLORS.length; c++) {
            if (!taken.has(c) && (best < 0 || used[c] < used[best])) best = c;
        }
        // Ne devrait pas arriver (zone avec 10 voisines ou plus) : couleur à la suite
        if (best < 0) best = r % REGION_COLORS.length;
        colors[r] = best;
        used[best]++;
    }
    return colors;
}
