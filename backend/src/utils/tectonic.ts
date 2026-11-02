/*
 * Moteur du Tectonic (aussi appelé Suguru) : grille découpée en zones de 1 à 5 cases.
 *
 * Règles :
 * 1. une zone de n cases contient les nombres de 1 à n, une fois chacun
 * 2. deux cases voisines (diagonales comprises) n'ont jamais le même nombre
 *
 * Représentation : grille aplatie (index = ligne * largeur + colonne).
 * - regions[i] : numéro de la zone de la case i
 * - cells[i] : nombre donné au départ, ou null pour une case à remplir
 */

export type TectonicPuzzle = {
    width: number;
    height: number;
    regions: number[];
    cells: (number | null)[];
};

export const MAX_REGION_SIZE = 5;

// Taille voulue d'une nouvelle zone : surtout des grandes zones, quelques petites
const REGION_SIZE_WEIGHTS = [[5, 50], [4, 30], [3, 14], [2, 4], [1, 2]] as const;

function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
}

function randomRegionSize(): number {
    const total = REGION_SIZE_WEIGHTS.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [size, weight] of REGION_SIZE_WEIGHTS) {
        r -= weight;
        if (r < 0) return size;
    }
    return MAX_REGION_SIZE;
}

// Voisins d'une case : orthogonaux (pour former les zones) et les 8 autour (pour la règle des voisins)
type Geometry = { orthogonal: number[][]; around: number[][] };
const geometryCache = new Map<string, Geometry>();

export function tectonicGeometry(width: number, height: number): Geometry {
    const key = `${width}x${height}`;
    const cached = geometryCache.get(key);
    if (cached) return cached;
    const orthogonal: number[][] = [];
    const around: number[][] = [];
    for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
            const ortho: number[] = [];
            const all: number[] = [];
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const rr = r + dr, cc = c + dc;
                    if (rr < 0 || rr >= height || cc < 0 || cc >= width) continue;
                    all.push(rr * width + cc);
                    if (dr === 0 || dc === 0) ortho.push(rr * width + cc);
                }
            }
            orthogonal.push(ortho);
            around.push(all);
        }
    }
    const geometry = {orthogonal, around};
    geometryCache.set(key, geometry);
    return geometry;
}

/*
 * Découpe la grille en zones de 1 à 5 cases (cases d'une zone reliées par leurs côtés).
 * On part toujours de la case libre la plus coincée, pour éviter de laisser des cases isolées.
 */
export function randomRegions(width: number, height: number): number[] {
    const {orthogonal} = tectonicGeometry(width, height);
    const regions = Array<number>(width * height).fill(-1);
    const freeNeighbors = (i: number) => orthogonal[i]!.filter(n => regions[n] === -1).length;
    let region = 0;

    for (; ;) {
        const free = shuffle(regions.map((v, i) => (v === -1 ? i : -1)).filter(i => i >= 0));
        if (free.length === 0) break;
        let start = free[0]!;
        for (const i of free) if (freeNeighbors(i) < freeNeighbors(start)) start = i;

        const target = randomRegionSize();
        const members = [start];
        regions[start] = region;
        while (members.length < target) {
            const frontier = shuffle([...new Set(members.flatMap(m => orthogonal[m]!.filter(n => regions[n] === -1)))]);
            if (frontier.length === 0) break;
            // Préfère les cases qui seraient isolées sinon
            frontier.sort((a, b) => freeNeighbors(a) - freeNeighbors(b));
            const next = frontier[0]!;
            regions[next] = region;
            members.push(next);
        }
        region++;
    }
    return mergeSmallRegions(regions, orthogonal);
}

/*
 * Les petites zones voisines rendent souvent la grille impossible (deux zones d'une case qui se touchent
 * doivent toutes deux contenir 1). Chaque zone de 1 ou 2 cases rejoint donc une zone voisine quand
 * le total ne dépasse pas 5 cases. Les numéros de zone sont ensuite renumérotés de 0 à n-1.
 */
function mergeSmallRegions(regions: number[], orthogonal: number[][]): number[] {
    for (let merged = true; merged;) {
        merged = false;
        const sizes = regionSizes(regions);
        for (let r = 0; r < sizes.length && !merged; r++) {
            if (!sizes[r] || sizes[r]! > 2) continue;
            const around = new Set<number>();
            regions.forEach((reg, i) => {
                if (reg === r) for (const n of orthogonal[i]!) if (regions[n] !== r) around.add(regions[n]!);
            });
            const target = shuffle([...around]).filter(o => sizes[o]! + sizes[r]! <= MAX_REGION_SIZE)
                .sort((a, b) => sizes[a]! - sizes[b]!)[0];
            if (target === undefined) continue;
            regions.forEach((reg, i) => {
                if (reg === r) regions[i] = target;
            });
            merged = true;
        }
    }
    const ids = new Map<number, number>();
    return regions.map(r => {
        if (!ids.has(r)) ids.set(r, ids.size);
        return ids.get(r)!;
    });
}

// Taille de chaque zone
export function regionSizes(regions: number[]): number[] {
    const sizes: number[] = [];
    for (const r of regions) sizes[r] = (sizes[r] ?? 0) + 1;
    return sizes;
}

/*
 * Résout une grille (backtracking, case la plus contrainte d'abord).
 * - count : nombre de solutions trouvées, au plus `limit`
 * - solution : la première trouvée
 * - aborted : recherche arrêtée après `maxNodes` essais (résultat incertain)
 * Options :
 * - random : mélange l'ordre des nombres essayés (pour créer une grille pleine au hasard)
 * - exclude : interdit un nombre dans une case (cherche une autre solution que celle connue)
 */
export type SolveOptions = { limit?: number; maxNodes?: number; random?: boolean; exclude?: { cell: number; value: number } };

export function solveTectonic(puzzle: TectonicPuzzle, options: SolveOptions = {}) {
    const {limit = 2, maxNodes = 200_000, random = false, exclude} = options;
    const {width, height, regions} = puzzle;
    const {around} = tectonicGeometry(width, height);
    const sizes = regionSizes(regions);
    const values = puzzle.cells.map(v => v ?? 0);
    const n = values.length;
    // Nombres déjà posés dans chaque zone (bit v = nombre v)
    const used = Array<number>(sizes.length).fill(0);
    for (let i = 0; i < n; i++) if (values[i]) used[regions[i]!] = used[regions[i]!]! | (1 << values[i]!);

    let count = 0;
    let nodes = 0;
    let solution: number[] | null = null;

    const candidates = (i: number) => {
        let mask = ((1 << (sizes[regions[i]!]! + 1)) - 2) & ~used[regions[i]!]!;
        for (const nb of around[i]!) if (values[nb]) mask &= ~(1 << values[nb]!);
        if (exclude && exclude.cell === i) mask &= ~(1 << exclude.value);
        return mask;
    };
    // Par zone : nombres encore possibles quelque part (un nombre qui ne rentre nulle part = impasse)
    const reachable = Array<number>(sizes.length).fill(0);

    const search = (): boolean => {
        if (++nodes > maxNodes) return true;
        // Case vide qui a le moins de possibilités
        let best = -1, bestMask = 0, bestCount = 99;
        reachable.fill(0);
        for (let i = 0; i < n; i++) {
            if (values[i]) continue;
            const mask = candidates(i);
            reachable[regions[i]!] = reachable[regions[i]!]! | mask;
            let c = 0;
            for (let m = mask; m; m &= m - 1) c++;
            if (c < bestCount) {
                best = i;
                bestMask = mask;
                bestCount = c;
                if (c === 0) return false;
            }
        }
        for (let r = 0; r < sizes.length; r++) {
            const missing = ((1 << (sizes[r]! + 1)) - 2) & ~used[r]!;
            if ((missing & reachable[r]!) !== missing) return false;
        }
        if (best === -1) {
            count++;
            if (!solution) solution = values.slice();
            return count >= limit;
        }
        if (bestCount === 0) return false;

        const options: number[] = [];
        for (let v = 1; v <= MAX_REGION_SIZE; v++) if (bestMask & (1 << v)) options.push(v);
        if (random) shuffle(options);
        const region = regions[best]!;
        for (const v of options) {
            values[best] = v;
            used[region] = used[region]! | (1 << v);
            const stop = search();
            values[best] = 0;
            used[region] = used[region]! & ~(1 << v);
            if (stop) return true;
        }
        return false;
    };

    // Grille de départ déjà fausse : aucune solution
    if (!isConsistent(puzzle, values)) return {count: 0, solution: null, aborted: false};
    search();
    return {count, solution: solution as number[] | null, aborted: nodes > maxNodes};
}

// true si les nombres posés (0 = vide) ne contredisent encore aucune règle
function isConsistent(puzzle: TectonicPuzzle, values: number[]): boolean {
    const {width, height, regions} = puzzle;
    const {around} = tectonicGeometry(width, height);
    const sizes = regionSizes(regions);
    const seen = new Set<string>();
    for (let i = 0; i < values.length; i++) {
        const v = values[i]!;
        if (!v) continue;
        if (v < 1 || v > sizes[regions[i]!]!) return false;
        const key = `${regions[i]}:${v}`;
        if (seen.has(key)) return false;
        seen.add(key);
        if (around[i]!.some(nb => values[nb] === v)) return false;
    }
    return true;
}

/*
 * Test rapide d'un découpage, avant de chercher à le remplir : les 4 cases d'un carré 2×2 se touchent
 * toutes, il leur faut donc 4 nombres différents. Impossible si, par exemple, 3 d'entre elles sont
 * dans des zones de 2 cases ou moins (elles n'ont que 1 et 2 à se partager).
 */
export function blocksCanBeFilled(width: number, height: number, regions: number[]): boolean {
    const sizes = regionSizes(regions);
    for (let r = 0; r + 1 < height; r++) {
        for (let c = 0; c + 1 < width; c++) {
            const block = [r * width + c, r * width + c + 1, (r + 1) * width + c, (r + 1) * width + c + 1]
                .map(i => sizes[regions[i]!]!).sort((a, b) => a - b);
            // k-ième plus petite zone : il lui faut au moins k nombres possibles
            if (block.some((size, k) => size < k + 1)) return false;
        }
    }
    return true;
}

// Grille pleine au hasard (découpage + nombres), ou null si le découpage tiré n'a pas de solution
export function generateTectonicSolution(width: number, height: number): { regions: number[]; values: number[] } | null {
    const regions = randomRegions(width, height);
    if (!blocksCanBeFilled(width, height, regions)) return null;
    const empty: TectonicPuzzle = {width, height, regions, cells: Array(width * height).fill(null)};
    // Petit budget : un découpage qui ne se remplit pas vite est souvent impossible, mieux vaut en tirer un autre
    const {solution} = solveTectonic(empty, {limit: 1, maxNodes: 300, random: true});
    return solution ? {regions, values: solution} : null;
}

/*
 * Grille à solution unique avec `cluesCount` nombres donnés si possible.
 * On retire les nombres un par un, au hasard, tant que la solution reste unique.
 * Si on ne peut pas descendre jusqu'à `cluesCount`, la grille garde quelques nombres de plus.
 */
export function generateTectonic(width: number, height: number, cluesCount: number): TectonicPuzzle {
    let full = generateTectonicSolution(width, height);
    while (!full) full = generateTectonicSolution(width, height);

    const cells: (number | null)[] = full.values.slice();
    const puzzle: TectonicPuzzle = {width, height, regions: full.regions, cells};
    let clues = cells.length;
    for (const i of shuffle(cells.map((_, i) => i))) {
        if (clues <= cluesCount) break;
        const value = cells[i]!;
        cells[i] = null;
        // Toujours unique si aucune solution n'a un autre nombre dans cette case
        const {count, aborted} = solveTectonic(puzzle, {limit: 1, maxNodes: 50_000, exclude: {cell: i, value}});
        if (count === 0 && !aborted) clues--;
        else cells[i] = value;
    }
    return puzzle;
}

export const countTectonicClues = (puzzle: TectonicPuzzle) => puzzle.cells.filter(v => v !== null).length;

// true si `values` (un nombre par case) résout la grille en gardant les nombres donnés
export function isTectonicSolution(puzzle: TectonicPuzzle, values: unknown): values is number[] {
    if (!Array.isArray(values) || values.length !== puzzle.cells.length) return false;
    if (!values.every(v => Number.isInteger(v) && v >= 1)) return false;
    if (!puzzle.cells.every((clue, i) => clue === null || values[i] === clue)) return false;
    return isConsistent(puzzle, values as number[]);
}
