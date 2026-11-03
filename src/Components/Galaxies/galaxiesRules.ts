import type {Dot, GalaxiesPuzzle} from "../../Models/galaxies.model.ts";

/*
 * Règles des Galaxies, côté navigateur (même géométrie que le serveur, voir backend/src/utils/galaxies.ts).
 * Points en coordonnées doublées : le centre de la case (r, c) est (2r+1, 2c+1).
 * Murs : un identifiant par côté intérieur.
 * - sous la case (r, c) : r * largeur + c
 * - à droite de la case (r, c) : (hauteur-1) * largeur + r * (largeur-1) + c
 */

export const wallCount = (width: number, height: number) => (height - 1) * width + height * (width - 1);

export function wallBetween(a: number, b: number, width: number, height: number): number {
    const [lo, hi] = a < b ? [a, b] : [b, a];
    if (hi - lo === width) return lo;
    const r = Math.floor(lo / width), c = lo % width;
    return (height - 1) * width + r * (width - 1) + c;
}

export function wallCells(wall: number, width: number, height: number): [number, number] {
    const horizontal = (height - 1) * width;
    if (wall < horizontal) return [wall, wall + width];
    const v = wall - horizontal;
    const r = Math.floor(v / (width - 1)), c = v % (width - 1);
    return [r * width + c, r * width + c + 1];
}

// Mur sur le côté `side` de la case, ou null au bord de la grille
export function wallOnSide(cell: number, side: "top" | "right" | "bottom" | "left", width: number, height: number): number | null {
    const r = Math.floor(cell / width), c = cell % width;
    if (side === "top") return r > 0 ? wallBetween(cell, cell - width, width, height) : null;
    if (side === "bottom") return r < height - 1 ? wallBetween(cell, cell + width, width, height) : null;
    if (side === "left") return c > 0 ? wallBetween(cell, cell - 1, width, height) : null;
    return c < width - 1 ? wallBetween(cell, cell + 1, width, height) : null;
}

export function mirrorCell(cell: number, dot: Dot, width: number, height: number): number {
    const r = dot[0] - 1 - Math.floor(cell / width);
    const c = dot[1] - 1 - (cell % width);
    return r >= 0 && r < height && c >= 0 && c < width ? r * width + c : -1;
}

// Cases qui touchent le point (1 si centre de case, 2 si milieu de côté, 4 si coin)
export function coreCells(dot: Dot, width: number): number[] {
    const [y, x] = dot;
    const rows = y % 2 === 1 ? [(y - 1) / 2] : [y / 2 - 1, y / 2];
    const cols = x % 2 === 1 ? [(x - 1) / 2] : [x / 2 - 1, x / 2];
    return rows.flatMap(r => cols.map(c => r * width + c));
}

// Murs qui traversent un point (ils couperaient forcément sa galaxie)
export function wallsThroughDots(puzzle: GalaxiesPuzzle): Set<number> {
    const {width, height} = puzzle;
    const through = new Set<number>();
    for (const dot of puzzle.dots) {
        const core = coreCells(dot, width);
        for (const a of core) for (const b of core) {
            if (a < b && (b - a === width || (b - a === 1 && Math.floor(a / width) === Math.floor(b / width)))) {
                through.add(wallBetween(a, b, width, height));
            }
        }
    }
    return through;
}

export type RegionStatus = "valid" | "error" | "open";

export type BoardAnalysis = {
    // Numéro de zone de chaque case (zones = cases reliées sans traverser de mur)
    regionOf: number[];
    regions: { cells: number[]; dots: number[]; status: RegionStatus }[];
    // Murs posés à tort (à travers un point)
    badWalls: Set<number>;
    // Murs qui ne séparent rien : la même zone des deux côtés (bout de mur qui ne ferme aucune galaxie),
    // dans une zone terminée ou impossible
    strayWalls: Set<number>;
    // Toutes les galaxies sont bonnes, sans compter les murs qui ne séparent rien
    // (la grille paraît finie : on peut signaler l'erreur)
    complete: boolean;
    // Numéro de point de chaque case si le découpage est une solution (aucun mur en trop), sinon null
    solution: number[] | null;
};

/**
 * Découpe la grille selon les murs posés et juge chaque zone :
 * - valid : un seul point, zone symétrique autour de lui → colorée
 * - error : aucun point, ou un seul point mais zone pas symétrique (aucun mur ajouté ne pourra la sauver)
 * - open : plusieurs points, il reste des murs à tracer
 * Un mur avec la même zone des deux côtés ne sépare rien : la grille n'est alors pas une solution.
 */
export function analyzeBoard(puzzle: GalaxiesPuzzle, walls: Set<number>): BoardAnalysis {
    const {width, height, dots} = puzzle;
    const n = width * height;
    const regionOf = Array<number>(n).fill(-1);
    const regions: BoardAnalysis["regions"] = [];

    // Point de chaque case de cœur
    const dotsByCell = new Map<number, number[]>();
    dots.forEach((dot, d) => {
        for (const cell of coreCells(dot, width)) dotsByCell.set(cell, [...(dotsByCell.get(cell) ?? []), d]);
    });

    for (let start = 0; start < n; start++) {
        if (regionOf[start] !== -1) continue;
        const id = regions.length;
        const cells = [start];
        regionOf[start] = id;
        for (let k = 0; k < cells.length; k++) {
            const cell = cells[k]!;
            for (const side of ["top", "right", "bottom", "left"] as const) {
                const wall = wallOnSide(cell, side, width, height);
                if (wall === null || walls.has(wall)) continue;
                const [a, b] = wallCells(wall, width, height);
                const next = a === cell ? b : a;
                if (regionOf[next] === -1) {
                    regionOf[next] = id;
                    cells.push(next);
                }
            }
        }
        const regionDots = [...new Set(cells.flatMap(c => dotsByCell.get(c) ?? []))];
        let status: RegionStatus = "open";
        if (regionDots.length === 0) status = "error";
        else if (regionDots.length === 1) {
            const d = regionDots[0]!;
            const inRegion = new Set(cells);
            const symmetric = cells.every(c => inRegion.has(mirrorCell(c, dots[d]!, width, height)))
                && coreCells(dots[d]!, width).every(c => inRegion.has(c));
            status = symmetric ? "valid" : "error";
        }
        regions.push({cells, dots: regionDots, status});
    }

    const through = wallsThroughDots(puzzle);
    const badWalls = new Set([...walls].filter(w => through.has(w)));
    // (dans une zone encore ouverte, c'est peut-être un mur en cours de tracé : pas compté)
    const strayWalls = new Set([...walls].filter(w => {
        const [a, b] = wallCells(w, width, height);
        return regionOf[a] === regionOf[b] && regions[regionOf[a]!]!.status !== "open";
    }));
    const complete = badWalls.size === 0 && regions.every(r => r.status === "valid");
    const solution = complete && strayWalls.size === 0 ? regionOf.map(id => regions[id]!.dots[0]!) : null;
    return {regionOf, regions, badWalls, strayWalls, complete, solution};
}
