/*
 * Moteur des Galaxies (aussi appelé Tentai Show) : grille avec des points.
 *
 * Règles : découper la grille en zones (les « galaxies ») telles que
 * 1. chaque zone contient exactement un point
 * 2. chaque zone est symétrique par rotation d'un demi-tour autour de son point
 *
 * Coordonnées doublées pour les points : (y, x) avec 0 ≤ y ≤ 2·hauteur et 0 ≤ x ≤ 2·largeur.
 * Le centre de la case (r, c) est (2r+1, 2c+1) ; un point peut aussi être au milieu d'un côté
 * ou sur un coin. Le symétrique de la case (r, c) autour du point (y, x) est la case (y-1-r, x-1-c).
 *
 * Murs : un identifiant par côté intérieur entre deux cases.
 * - côté horizontal sous la case (r, c) : r * largeur + c                     (r < hauteur - 1)
 * - côté vertical à droite de la case (r, c) : (hauteur-1) * largeur + r * (largeur-1) + c   (c < largeur - 1)
 */

export type Dot = [number, number];

export type GalaxiesPuzzle = {
    width: number;
    height: number;
    dots: Dot[];
    // Murs déjà tracés au départ (aide)
    walls: number[];
};

function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
}

// Voisins orthogonaux de chaque case
function neighborsOf(width: number, height: number): number[][] {
    const out: number[][] = [];
    for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
            const n: number[] = [];
            if (r > 0) n.push((r - 1) * width + c);
            if (r < height - 1) n.push((r + 1) * width + c);
            if (c > 0) n.push(r * width + c - 1);
            if (c < width - 1) n.push(r * width + c + 1);
            out.push(n);
        }
    }
    return out;
}

// Case symétrique de `cell` autour du point, ou -1 si elle sort de la grille
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

// Identifiant du mur entre deux cases voisines
export function wallBetween(a: number, b: number, width: number, height: number): number {
    const [lo, hi] = a < b ? [a, b] : [b, a];
    if (hi - lo === width) return lo; // l'une au-dessus de l'autre
    const r = Math.floor(lo / width), c = lo % width;
    return (height - 1) * width + r * (width - 1) + c;
}

// Murs d'un découpage : tous les côtés entre deux cases de zones différentes
export function wallsOf(regions: number[], width: number, height: number): number[] {
    const walls: number[] = [];
    const neighbors = neighborsOf(width, height);
    for (let i = 0; i < regions.length; i++) {
        for (const n of neighbors[i]!) {
            if (n > i && regions[n] !== regions[i]) walls.push(wallBetween(i, n, width, height));
        }
    }
    return walls.sort((a, b) => a - b);
}

/*
 * Découpage au hasard en galaxies symétriques.
 * On pose un point (centre d'une case libre, ou milieu d'un côté / coin si les cases autour sont libres),
 * puis on fait grandir sa galaxie en ajoutant des paires de cases symétriques libres, collées à la galaxie.
 * On recommence tant qu'il reste des cases libres.
 */
export function randomGalaxies(width: number, height: number, maxSize: number): { dots: Dot[]; regions: number[] } {
    const n = width * height;
    const regions = Array<number>(n).fill(-1);
    const neighbors = neighborsOf(width, height);
    const dots: Dot[] = [];

    for (const start of shuffle(Array.from({length: n}, (_, i) => i))) {
        if (regions[start] !== -1) continue;
        const r = Math.floor(start / width), c = start % width;
        // Points possibles autour de cette case : centre, milieux des côtés droit / bas, coin bas-droit
        const candidates: Dot[] = shuffle([[2 * r + 2, 2 * c + 2], [2 * r + 1, 2 * c + 2], [2 * r + 2, 2 * c + 1]] as Dot[])
            .concat([[2 * r + 1, 2 * c + 1]]);
        const dot = candidates.find(d => d[0] < 2 * height && d[1] < 2 * width
            && coreCells(d, width).every(k => regions[k] === -1))!;
        const id = dots.length;
        dots.push(dot);
        const members = coreCells(dot, width);
        for (const k of members) regions[k] = id;

        // Taille voulue : entre la moitié de maxSize et maxSize (de grandes galaxies, moins de points)
        const target = Math.max(members.length, Math.ceil(maxSize / 2) + Math.floor(Math.random() * (Math.floor(maxSize / 2) + 1)));
        while (members.length < target) {
            const options = shuffle([...new Set(members.flatMap(m => neighbors[m]!))].filter(k => {
                if (regions[k] !== -1) return false;
                const m = mirrorCell(k, dot, width, height);
                return m !== -1 && regions[m] === -1;
            }));
            const next = options[0];
            if (next === undefined) break;
            const mirror = mirrorCell(next, dot, width, height);
            regions[next] = id;
            members.push(next);
            if (mirror !== next) {
                regions[mirror] = id;
                members.push(mirror);
            }
        }
    }
    return {dots, regions};
}

/*
 * Résout une grille : chaque case reçoit le numéro de son point.
 * Propagation (symétrie, accessibilité depuis le point) puis essais, case la moins libre d'abord.
 * - count : nombre de solutions trouvées, au plus `limit`
 * - aborted : recherche arrêtée après `maxNodes` essais (résultat incertain)
 * Les murs donnés séparent forcément deux zones différentes.
 */
export function solveGalaxies(puzzle: GalaxiesPuzzle, limit = 2, maxNodes = 20_000) {
    const {width, height, dots} = puzzle;
    const n = width * height;
    const k = dots.length;
    const neighbors = neighborsOf(width, height);
    const wallSet = new Set(puzzle.walls);
    const mirrors = dots.map(d => Array.from({length: n}, (_, i) => mirrorCell(i, d, width, height)));
    const cores = dots.map(d => coreCells(d, width));

    // domain[i * k + d] = 1 si la case i peut encore appartenir au point d
    const start = new Uint8Array(n * k);
    for (let i = 0; i < n; i++) for (let d = 0; d < k; d++) start[i * k + d] = mirrors[d]![i] === -1 ? 0 : 1;
    for (let d = 0; d < k; d++) {
        for (const cell of cores[d]!) for (let e = 0; e < k; e++) start[cell * k + e] = e === d ? 1 : 0;
    }

    let count = 0;
    let nodes = 0;
    let solution: number[] | null = null;

    // Réduit les possibilités jusqu'à stabilité ; false si une case n'a plus aucune possibilité
    const propagate = (dom: Uint8Array): boolean => {
        for (let changed = true; changed;) {
            changed = false;
            // Symétrie : d possible en i seulement si d possible en son symétrique
            for (let d = 0; d < k; d++) {
                const mirror = mirrors[d]!;
                for (let i = 0; i < n; i++) {
                    if (dom[i * k + d] && !dom[mirror[i]! * k + d]) {
                        dom[i * k + d] = 0;
                        changed = true;
                    }
                }
            }
            // Accessibilité : la galaxie d est d'un seul tenant, sans traverser de mur donné
            for (let d = 0; d < k; d++) {
                const seen = new Uint8Array(n);
                const queue = [...cores[d]!];
                for (const c of queue) seen[c] = 1;
                while (queue.length) {
                    const c = queue.pop()!;
                    for (const nb of neighbors[c]!) {
                        if (seen[nb] || !dom[nb * k + d] || wallSet.has(wallBetween(c, nb, width, height))) continue;
                        seen[nb] = 1;
                        queue.push(nb);
                    }
                }
                for (let i = 0; i < n; i++) {
                    if (dom[i * k + d] && !seen[i]) {
                        dom[i * k + d] = 0;
                        changed = true;
                    }
                }
            }
            // Un mur donné sépare deux galaxies différentes : une case fixée interdit son point de l'autre côté
            for (const wall of wallSet) {
                const [a, b] = wallCells(wall, width, height);
                for (const [x, y] of [[a, b], [b, a]] as const) {
                    const only = singleValue(dom, x, k);
                    if (only !== -1 && dom[y * k + only]) {
                        dom[y * k + only] = 0;
                        changed = true;
                    }
                }
            }
            for (let i = 0; i < n; i++) if (singleValue(dom, i, k) === -2) return false;
        }
        return true;
    };

    const search = (dom: Uint8Array): boolean => {
        if (++nodes > maxNodes) return true;
        if (!propagate(dom)) return false;
        // Case la moins libre
        let best = -1, bestCount = Infinity;
        for (let i = 0; i < n; i++) {
            let c = 0;
            for (let d = 0; d < k; d++) c += dom[i * k + d]!;
            if (c > 1 && c < bestCount) {
                best = i;
                bestCount = c;
            }
        }
        if (best === -1) {
            count++;
            if (!solution) solution = Array.from({length: n}, (_, i) => singleValue(dom, i, k));
            return count >= limit;
        }
        for (let d = 0; d < k; d++) {
            if (!dom[best * k + d]) continue;
            const next = dom.slice();
            for (let e = 0; e < k; e++) next[best * k + e] = e === d ? 1 : 0;
            const mirror = mirrors[d]![best]!;
            for (let e = 0; e < k; e++) next[mirror * k + e] = e === d ? 1 : 0;
            if (search(next)) return true;
        }
        return false;
    };

    search(start);
    return {count, solution: solution as number[] | null, aborted: nodes > maxNodes};
}

// Numéro de point si la case n'en a plus qu'un possible, -1 s'il en reste plusieurs, -2 s'il n'en reste aucun
function singleValue(dom: Uint8Array, cell: number, k: number): number {
    let found = -2;
    for (let d = 0; d < k; d++) {
        if (!dom[cell * k + d]) continue;
        if (found !== -2) return -1;
        found = d;
    }
    return found;
}

// Les deux cases de part et d'autre d'un mur
export function wallCells(wall: number, width: number, height: number): [number, number] {
    const horizontal = (height - 1) * width;
    if (wall < horizontal) return [wall, wall + width];
    const v = wall - horizontal;
    const r = Math.floor(v / (width - 1)), c = v % (width - 1);
    return [r * width + c, r * width + c + 1];
}

// Une galaxie pour 4,5 cases environ : ni trop de petits morceaux (trop facile), ni trop peu de points
export const targetDots = (width: number, height: number) => Math.round((width * height) / 4.5);

/*
 * Grille à solution unique (avec les seuls points), puis `hintWalls` murs de la solution donnés en aide.
 * On tire beaucoup de découpages (moins d'1 ms chacun) et on garde celui à solution unique dont le nombre
 * de points est le plus proche de la cible.
 */
export function generateGalaxies(width: number, height: number, hintWalls: number, maxTries = 400): { puzzle: GalaxiesPuzzle; solution: number[] } {
    const target = targetDots(width, height);
    const maxSize = 2 * Math.max(width, height);
    let best: { dots: Dot[]; regions: number[] } | null = null;
    for (let attempt = 0; attempt < maxTries; attempt++) {
        const candidate = randomGalaxies(width, height, maxSize);
        const gap = Math.abs(candidate.dots.length - target);
        if (best && gap >= Math.abs(best.dots.length - target)) continue;
        const {count, aborted} = solveGalaxies({width, height, dots: candidate.dots, walls: []}, 2);
        if (count !== 1 || aborted) continue;
        best = candidate;
        if (gap === 0) break;
    }
    // Filet de sécurité (jamais vu) : des galaxies d'une case, toujours à solution unique
    best ??= {
        dots: Array.from({length: width * height}, (_, i) => [2 * Math.floor(i / width) + 1, 2 * (i % width) + 1] as Dot),
        regions: Array.from({length: width * height}, (_, i) => i),
    };
    const walls = shuffle(wallsOf(best.regions, width, height)).slice(0, hintWalls).sort((a, b) => a - b);
    return {puzzle: {width, height, dots: best.dots, walls}, solution: best.regions};
}

/*
 * true si `regions` (numéro de point pour chaque case) est une solution :
 * chaque galaxie contient son point, est symétrique autour de lui, d'un seul tenant,
 * et aucun mur donné ne coupe une galaxie.
 */
export function isGalaxiesSolution(puzzle: GalaxiesPuzzle, regions: unknown): regions is number[] {
    const {width, height, dots} = puzzle;
    const n = width * height;
    if (!Array.isArray(regions) || regions.length !== n) return false;
    if (!regions.every(v => Number.isInteger(v) && v >= 0 && v < dots.length)) return false;
    const cells = regions as number[];

    for (let d = 0; d < dots.length; d++) {
        const dot = dots[d]!;
        if (!coreCells(dot, width).every(c => cells[c] === d)) return false;
        const members = cells.flatMap((v, i) => (v === d ? [i] : []));
        if (!members.every(i => {
            const m = mirrorCell(i, dot, width, height);
            return m !== -1 && cells[m] === d;
        })) return false;
        // D'un seul tenant
        const neighbors = neighborsOf(width, height);
        const seen = new Set([members[0]!]);
        const queue = [members[0]!];
        while (queue.length) {
            const c = queue.pop()!;
            for (const nb of neighbors[c]!) {
                if (cells[nb] === d && !seen.has(nb)) {
                    seen.add(nb);
                    queue.push(nb);
                }
            }
        }
        if (seen.size !== members.length) return false;
    }
    return puzzle.walls.every(w => {
        const [a, b] = wallCells(w, width, height);
        return cells[a] !== cells[b];
    });
}
