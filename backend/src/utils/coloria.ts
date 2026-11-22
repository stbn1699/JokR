import {clampXp} from "./xpBounds.js";
import {creditsFor} from "./credits.js";

/*
 * Coloria : colorier des zones pour que deux zones qui se touchent n'aient jamais la même couleur.
 * Difficulté : plus il y a de zones et moins il y a de couleurs, plus c'est dur.
 *
 * Génération : on part d'un découpage déjà correctement colorié et on fusionne des zones jusqu'au nombre voulu sans
 * jamais casser le coloriage.
 * - 3 couleurs : quelques zones sont données, juste assez pour tout résoudre par déduction (une seule solution)
 * - 4 ou 5 couleurs : rien n'est donné, car il faudrait révéler plus de la moitié des zones pour n'avoir qu'une
 *   solution ; tout coloriage qui respecte la règle gagne
 */

export type ColoriaPuzzle = {
    width: number;
    zones: number;
    colors: number;
    // zone de chaque case, ligne par ligne
    regions: number[];
    // couleur donnée de chaque zone, -1 si elle est à trouver
    given: number[];
    solution: number[];
};
export type PublicColoria = Omit<ColoriaPuzzle, "solution">;
type Random = (max: number) => number;

export const COLORIA_DEFAULT_ZONES = 20;
export const COLORIA_SIZES = [
    {size: 12, min: 3, max: 5, default: 3},
    {size: 20, min: 3, max: 5, default: 3},
    {size: 30, min: 3, max: 5, default: 3},
    {size: 45, min: 3, max: 5, default: 3},
    {size: 60, min: 3, max: 5, default: 3},
] as const;

const CELLS_PER_ZONE = 5;
export const coloriaWidth = (zones: number) => Math.round(Math.sqrt(zones * CELLS_PER_ZONE));

const neighboursOf = (cell: number, width: number) => {
    const out: number[] = [];
    const row = Math.floor(cell / width), col = cell % width;
    if (col > 0) out.push(cell - 1);
    if (col < width - 1) out.push(cell + 1);
    if (row > 0) out.push(cell - width);
    if (row < width - 1) out.push(cell + width);
    return out;
};

// Zones qui se touchent par un côté
export function zoneNeighbours(regions: readonly number[], width: number, zones: number): Set<number>[] {
    const links = Array.from({length: zones}, () => new Set<number>());
    regions.forEach((zone, cell) => {
        for (const next of neighboursOf(cell, width)) {
            if (regions[next] !== zone) links[zone]!.add(regions[next]!);
        }
    });
    return links;
}

// Découpage aléatoire : des graines qui grandissent chacune leur tour
function growRegions(width: number, seeds: number, random: Random): number[] {
    const total = width * width;
    const regions = new Array<number>(total).fill(-1);
    const frontiers: number[][] = [];
    for (let zone = 0; zone < seeds; zone++) {
        let cell = random(total);
        while (regions[cell] !== -1) cell = (cell + 1) % total;
        regions[cell] = zone;
        frontiers.push([cell]);
    }
    let left = total - seeds;
    while (left > 0) {
        const frontier = frontiers[random(seeds)]!;
        if (frontier.length === 0) continue;
        const index = random(frontier.length);
        const free = neighboursOf(frontier[index]!, width).filter(next => regions[next] === -1);
        if (free.length === 0) {
            frontier.splice(index, 1);
            continue;
        }
        const next = free[random(free.length)]!;
        regions[next] = regions[frontier[index]!]!;
        frontier.push(next);
        left--;
    }
    return regions;
}

// Numérote les zones de 0 à n-1 et reporte leurs couleurs
function compact(regions: number[], colorOf: Map<number, number>) {
    const ids = new Map<number, number>();
    const next = regions.map(zone => {
        if (!ids.has(zone)) ids.set(zone, ids.size);
        return ids.get(zone)!;
    });
    const colors = new Array<number>(ids.size);
    for (const [zone, id] of ids) colors[id] = colorOf.get(zone)!;
    return {regions: next, colors};
}

// Découpage de `target` zones, avec un coloriage correct en `k` couleurs ; null si cet essai n'aboutit pas
function buildMap(width: number, target: number, k: number, random: Random): { regions: number[]; colors: number[] } | null {
    const seeds = Math.min(width * width, Math.round(target * 3));
    let regions = growRegions(width, seeds, random);
    // Chaque graine prend la couleur la moins présente autour d'elle : peu de zones à fusionner ensuite
    const colorOf = new Map<number, number>();
    const seedLinks = zoneNeighbours(regions, width, seeds);
    const seedOrder = Array.from({length: seeds}, (_, i) => i);
    for (let i = seedOrder.length - 1; i > 0; i--) {
        const j = random(i + 1);
        [seedOrder[i], seedOrder[j]] = [seedOrder[j]!, seedOrder[i]!];
    }
    for (const zone of seedOrder) {
        const around = new Array<number>(k).fill(0);
        for (const other of seedLinks[zone]!) {
            const color = colorOf.get(other);
            if (color !== undefined) around[color]!++;
        }
        const fewest = Math.min(...around);
        const options = around.flatMap((n, color) => (n === fewest ? [color] : []));
        colorOf.set(zone, options[random(options.length)]!);
    }

    // Deux zones voisines de même couleur n'en font plus qu'une
    const parent = Array.from({length: seeds}, (_, i) => i);
    const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x]!)));
    regions.forEach((zone, cell) => {
        for (const next of neighboursOf(cell, width)) {
            const other = regions[next]!;
            if (colorOf.get(zone) === colorOf.get(other)) parent[find(zone)] = find(other);
        }
    });
    regions = regions.map(find);
    let map = compact(regions, colorOf);
    let count = map.colors.length;
    if (count < target) return null;

    // Fusionne les plus petites zones, en leur donnant une couleur libre autour d'elles
    while (count > target) {
        const sizes = new Array<number>(count).fill(0);
        map.regions.forEach(zone => sizes[zone]!++);
        const links = zoneNeighbours(map.regions, width, count);
        const order = Array.from({length: count}, (_, i) => i).sort((a, b) => sizes[a]! - sizes[b]! || random(3) - 1);

        let merged = false;
        for (const a of order) {
            for (const b of [...links[a]!].sort((x, y) => sizes[x]! - sizes[y]!)) {
                const around = new Set([...links[a]!, ...links[b]!]);
                around.delete(a);
                around.delete(b);
                const used = new Set([...around].map(zone => map.colors[zone]));
                const free = Array.from({length: k}, (_, c) => c).filter(c => !used.has(c));
                if (free.length === 0) continue;

                const color = free[random(free.length)]!;
                const recolored = new Map(map.colors.map((c, zone) => [zone, zone === a || zone === b ? color : c]));
                map = compact(map.regions.map(zone => (zone === b ? a : zone)), recolored);
                count--;
                merged = true;
                break;
            }
            if (merged) break;
        }
        if (!merged) return null;
    }

    const sizes = new Array<number>(count).fill(0);
    map.regions.forEach(zone => sizes[zone]!++);
    if (sizes.some(size => size < 2) || new Set(map.colors).size < k) return null;
    return map;
}

const isSingle = (bits: number) => bits !== 0 && (bits & (bits - 1)) === 0;

// Une zone qui a sa couleur l'interdit à ses voisines ; false si une zone n'a plus aucune couleur possible
function propagate(domains: number[], links: number[][]): boolean {
    const queue: number[] = [];
    domains.forEach((bits, zone) => {
        if (bits === 0) queue.length = 0;
        if (isSingle(bits)) queue.push(zone);
    });
    if (domains.includes(0)) return false;
    while (queue.length > 0) {
        const zone = queue.pop()!;
        const bit = domains[zone]!;
        for (const next of links[zone]!) {
            if (!(domains[next]! & bit)) continue;
            domains[next] = domains[next]! & ~bit;
            if (domains[next] === 0) return false;
            if (isSingle(domains[next]!)) queue.push(next);
        }
    }
    return true;
}

// Résout par déduction : élimination, puis « si je mets cette couleur ici, ça bloque » (un seul coup d'avance)
export function solvesByLogic(given: readonly number[], links: number[][], k: number): boolean {
    const all = (1 << k) - 1;
    const domains = given.map(color => (color >= 0 ? 1 << color : all));
    if (!propagate(domains, links)) return false;

    for (;;) {
        if (domains.every(isSingle)) return true;
        let changed = false;
        for (let zone = 0; zone < domains.length; zone++) {
            if (isSingle(domains[zone]!)) continue;
            for (let c = 0; c < k; c++) {
                const bit = 1 << c;
                if (!(domains[zone]! & bit)) continue;
                const attempt = [...domains];
                attempt[zone] = bit;
                if (propagate(attempt, links)) continue;
                domains[zone] = domains[zone]! & ~bit;
                if (!propagate(domains, links)) return false;
                changed = true;
            }
        }
        if (!changed) return false;
    }
}

export function generateColoria(zones: number, k: number, random: Random): ColoriaPuzzle {
    const width = coloriaWidth(zones);
    for (let attempt = 0; attempt < 400; attempt++) {
        const map = buildMap(width, zones, k, random);
        if (!map) continue;
        if (k > 3) {
            return {width, zones, colors: k, regions: map.regions, given: new Array<number>(zones).fill(-1), solution: map.colors};
        }
        const links = zoneNeighbours(map.regions, width, zones).map(set => [...set]);

        const given = [...map.colors];
        const order = Array.from({length: zones}, (_, i) => i);
        for (let i = order.length - 1; i > 0; i--) {
            const j = random(i + 1);
            [order[i], order[j]] = [order[j]!, order[i]!];
        }
        for (const zone of order) {
            const color = given[zone]!;
            given[zone] = -1;
            if (!solvesByLogic(given, links, k)) given[zone] = color;
        }
        return {width, zones, colors: k, regions: map.regions, given, solution: map.colors};
    }
    throw new Error(`Grille impossible (${zones} zones, ${k} couleurs)`);
}

// Toutes les zones coloriées, couleurs données respectées, jamais deux voisines de même couleur
export function isColoriaSolution(puzzle: ColoriaPuzzle, colors: unknown): colors is number[] {
    if (!Array.isArray(colors) || colors.length !== puzzle.zones) return false;
    if (!colors.every(color => Number.isInteger(color) && color >= 0 && color < puzzle.colors)) return false;
    if (puzzle.given.some((color, zone) => color >= 0 && colors[zone] !== color)) return false;
    return zoneNeighbours(puzzle.regions, puzzle.width, puzzle.zones)
        .every((links, zone) => [...links].every(other => colors[other] !== colors[zone]));
}

// Référence : baseXp pour 30 zones en 3 couleurs ; chaque couleur en plus rend la grille plus facile
export function coloriaXp(baseXp: number, zones: number, k: number): number {
    return clampXp(baseXp * Math.pow(zones / 30, 1.1) * (1 - 0.3 * (k - 3)));
}

export const coloriaCredits = (zones: number, k: number) => creditsFor(zones - (k - 3) * 15, 0, 60);
