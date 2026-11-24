/*
 * Dessin de la zone encore couverte du Démineur : un aplat bleu aux coins arrondis.
 * - coin saillant (90°) : la case couverte a son coin arrondi
 * - coin rentrant (270°) : un petit congé bleu comble le coin de la case libérée
 * - frontières noires entre la zone et les cases libérées, raccourcies là où un coin arrondi prend le relais
 * Hors du plateau compte comme couvert : pas d'arrondi ni de trait contre le cadre.
 */

export type CoveredShape = {
    // contour de chaque case couverte (coins saillants arrondis)
    cells: { cell: number; d: string }[];
    // congés des coins rentrants, posés dans les cases libérées
    fillets: { key: string; d: string }[];
    // traits noirs : segments droits et arcs des coins
    borders: { key: string; d: string }[];
    // pointillés légers entre deux cases couvertes
    dashes: { key: string; d: string }[];
};

// Arc d'un quart de cercle dans le coin (cx, cy), (dx, dy) pointant vers le centre de l'arc
const arc = (cx: number, cy: number, dx: number, dy: number, r: number) =>
    `M${cx + r * dx} ${cy} A${r} ${r} 0 0 ${dx * dy > 0 ? 0 : 1} ${cx} ${cy + r * dy}`;

// Les quatre coins d'une case : décalage du coin et direction vers l'intérieur de la case
const CORNERS = [
    {ox: 0, oy: 0, dx: 1, dy: 1},   // haut gauche
    {ox: 1, oy: 0, dx: -1, dy: 1},  // haut droit
    {ox: 1, oy: 1, dx: -1, dy: -1}, // bas droit
    {ox: 0, oy: 1, dx: 1, dy: -1},  // bas gauche
] as const;

export function coveredShape(size: number, isCovered: (cell: number) => boolean, r: number): CoveredShape {
    const covered = (x: number, y: number) => x < 0 || y < 0 || x >= size || y >= size || isCovered(y * size + x);
    const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < size && y < size;
    const shape: CoveredShape = {cells: [], fillets: [], borders: [], dashes: []};

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const cell = y * size + x;

            if (!covered(x, y)) {
                // coin rentrant : les deux voisines du coin et la diagonale sont couvertes
                CORNERS.forEach(({ox, oy, dx, dy}, i) => {
                    const [sx, sy] = [x - dx, y - dy];
                    // (coin du plateau : rien, le cadre est déjà arrondi)
                    if (covered(sx, y) && covered(x, sy) && covered(sx, sy) && (inside(sx, y) || inside(x, sy))) {
                        const [cx, cy] = [x + ox, y + oy];
                        const d = arc(cx, cy, dx, dy, r);
                        shape.fillets.push({key: `${cell}-${i}`, d: `M${cx} ${cy} L${d.slice(1)} Z`});
                        shape.borders.push({key: `f${cell}-${i}`, d});
                    }
                });
                continue;
            }

            // coin saillant : les deux voisines du coin sont libérées
            const radius = CORNERS.map(({dx, dy}) => (!covered(x - dx, y) && !covered(x, y - dy) ? r : 0));
            const [tl, tr, br, bl] = radius as [number, number, number, number];
            shape.cells.push({
                cell,
                d: `M${x + tl} ${y} H${x + 1 - tr} A${tr} ${tr} 0 0 1 ${x + 1} ${y + tr} V${y + 1 - br} `
                    + `A${br} ${br} 0 0 1 ${x + 1 - br} ${y + 1} H${x + bl} A${bl} ${bl} 0 0 1 ${x} ${y + 1 - bl} `
                    + `V${y + tl} A${tl} ${tl} 0 0 1 ${x + tl} ${y} Z`,
            });
            CORNERS.forEach(({ox, oy, dx, dy}, i) => {
                if (radius[i]) shape.borders.push({key: `c${cell}-${i}`, d: arc(x + ox, y + oy, dx, dy, r)});
            });

            // côtés tournés vers une case libérée : trait noir, raccourci aux coins arrondis
            const sides = [
                {nx: x, ny: y - 1, from: [x, y], to: [x + 1, y], along: [1, 0]},
                {nx: x + 1, ny: y, from: [x + 1, y], to: [x + 1, y + 1], along: [0, 1]},
                {nx: x, ny: y + 1, from: [x, y + 1], to: [x + 1, y + 1], along: [1, 0]},
                {nx: x - 1, ny: y, from: [x, y], to: [x, y + 1], along: [0, 1]},
            ] as const;
            sides.forEach(({nx, ny, from, to, along}, i) => {
                if (covered(nx, ny)) {
                    // deux cases couvertes : pointillés légers (une seule fois par côté)
                    if ((i === 1 || i === 2) && inside(nx, ny)) {
                        shape.dashes.push({key: `${cell}-${i}`, d: `M${from[0]} ${from[1]} L${to[0]} ${to[1]}`});
                    }
                    return;
                }
                const [ax, ay] = along;
                // bout de côté : voisine dans le prolongement (côté de la case) et sa diagonale côté libéré
                const rounded = (ex: number, ey: number) => {
                    const sideCovered = covered(x + ex, y + ey);
                    const diagCovered = covered(nx + ex, ny + ey);
                    return !sideCovered || diagCovered;
                };
                const startCut = rounded(-ax, -ay) ? r : 0;
                const endCut = rounded(ax, ay) ? r : 0;
                shape.borders.push({
                    key: `s${cell}-${i}`,
                    d: `M${from[0] + ax * startCut} ${from[1] + ay * startCut} L${to[0] - ax * endCut} ${to[1] - ay * endCut}`,
                });
            });
        }
    }
    return shape;
}
