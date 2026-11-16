/*
 * Guide du tutoriel du Rikudo : trouve la prochaine déduction qu'un joueur peut faire, comme le ferait un prof à côté
 * de lui. Le tutoriel s'en sert pour avancer pas à pas, et la génération des niveaux pour noter les grilles.
 * Plateau en nid d'abeille de `radius` anneaux (sans la case centrale), cases numérotées comme le serveur
 * (backend/src/utils/rikudo.ts) ; values[i] : nombre de la case, null si vide.
 * Pur calcul (pas de navigateur) : utilisé aussi par les tests et les scripts de génération.
 */

export type RikudoGuidePuzzle = { radius: number; links: [number, number][] };

export type RikudoRule =
    // le chaînon manquant : v - 1 et v + 1 sont posés, une seule case vide touche les deux
    | "gap"
    // la bonne distance : une seule case vide est assez près des nombres posés avant et après v
    | "near"
    // les points : une case liée à un nombre posé prend forcément un nombre qui le suit ou le précède
    | "link";

export type RikudoStep = {
    rule: RikudoRule;
    cell: number;
    value: number;
    // cases à mettre en lumière (pour comprendre)
    spotlight: number[];
    // "near" : nombres posés juste avant et juste après (pour l'explication)
    before?: number;
    after?: number;
};

const ALL: RikudoRule[] = ["gap", "near", "link"];
const DIRECTIONS: [number, number][] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

const geometries = new Map<number, { coords: [number, number][]; neighbors: number[][] }>();
export function rikudoGeometry(radius: number) {
    let g = geometries.get(radius);
    if (g) return g;
    const coords: [number, number][] = [];
    for (let r = -radius; r <= radius; r++) {
        for (let q = Math.max(-radius, -r - radius); q <= Math.min(radius, -r + radius); q++) {
            if (q !== 0 || r !== 0) coords.push([q, r]);
        }
    }
    const index = new Map(coords.map(([q, r], i) => [`${q},${r}`, i]));
    const neighbors = coords.map(([q, r]) => DIRECTIONS.map(([dq, dr]) => index.get(`${q + dq},${r + dr}`))
        .filter((i): i is number => i !== undefined));
    g = {coords, neighbors};
    geometries.set(radius, g);
    return g;
}

/**
 * Prochaine déduction, par ordre de simplicité (seulement parmi `allowed`), ou null s'il n'y en a plus avec ces
 * règles (grille finie, ou il faut une technique plus avancée).
 */
export function nextRikudoStep(p: RikudoGuidePuzzle, values: (number | null)[], allowed: RikudoRule[] = ALL): RikudoStep | null {
    const {coords, neighbors} = rikudoGeometry(p.radius);
    const n = coords.length;
    // la case centrale est vide : la distance passe par le nid d'abeille, sans le trou du milieu
    const dist = distances(neighbors);
    const pos = new Map<number, number>();
    values.forEach((v, i) => v !== null && pos.set(v, i));
    const empties = values.flatMap((v, i) => (v === null ? [i] : []));
    const linked = (c: number) => p.links.flatMap(([a, b]) => (a === c ? [b] : b === c ? [a] : []));

    // cases possibles pour v : assez près de tous les nombres posés (et des points, si permis)
    const candidates = (v: number, withLinks: boolean) => empties.filter(c => {
        for (const [w, at] of pos) if (dist[c]![at]! > Math.abs(v - w)) return false;
        if (!withLinks) return true;
        return linked(c).every(d => {
            const w = values[d];
            if (w !== null && w !== undefined) return Math.abs(v - w) === 1;
            return !pos.has(v - 1) || !pos.has(v + 1);
        });
    });

    const missing = Array.from({length: n}, (_, k) => k + 1).filter(v => !pos.has(v));

    if (allowed.includes("gap")) {
        for (const v of missing) {
            const a = pos.get(v - 1), b = pos.get(v + 1);
            if (a === undefined || b === undefined) continue;
            const common = neighbors[a]!.filter(c => values[c] === null && neighbors[b]!.includes(c));
            if (common.length === 1) return {rule: "gap", cell: common[0]!, value: v, spotlight: [a, b, common[0]!]};
        }
    }

    if (allowed.includes("near")) {
        for (const v of missing) {
            const cand = candidates(v, false);
            if (cand.length !== 1) continue;
            const before = Math.max(0, ...[...pos.keys()].filter(w => w < v));
            const after = Math.min(n + 1, ...[...pos.keys()].filter(w => w > v));
            const spotlight = [cand[0]!, ...[before, after].flatMap(w => (pos.has(w) ? [pos.get(w)!] : []))];
            return {rule: "near", cell: cand[0]!, value: v, spotlight, before, after};
        }
    }

    if (allowed.includes("link")) {
        for (const v of missing) {
            const cand = candidates(v, true);
            if (cand.length !== 1) continue;
            const c = cand[0]!;
            return {rule: "link", cell: c, value: v, spotlight: [c, ...linked(c), ...[v - 1, v + 1].flatMap(w => (pos.has(w) ? [pos.get(w)!] : []))]};
        }
    }
    return null;
}

// Distance en nombre de pas de case en case (chemin le plus court sur le plateau)
const distanceCache = new WeakMap<number[][], number[][]>();
function distances(neighbors: number[][]): number[][] {
    const cached = distanceCache.get(neighbors);
    if (cached) return cached;
    const all = neighbors.map((_, s) => {
        const d = Array<number>(neighbors.length).fill(Infinity);
        d[s] = 0;
        const queue = [s];
        for (let k = 0; k < queue.length; k++) {
            for (const nb of neighbors[queue[k]!]!) {
                if (d[nb] === Infinity) {
                    d[nb] = d[queue[k]!]! + 1;
                    queue.push(nb);
                }
            }
        }
        return d;
    });
    distanceCache.set(neighbors, all);
    return all;
}

// Résout avec les règles permises : règles utilisées dans l'ordre, et si la grille est finie
export function solveRikudoWithGuide(p: RikudoGuidePuzzle, start: (number | null)[], allowed: RikudoRule[] = ALL): { rules: RikudoRule[]; solved: boolean; values: (number | null)[] } {
    const values = [...start];
    const rules: RikudoRule[] = [];
    for (let guard = 0; guard < values.length; guard++) {
        const step = nextRikudoStep(p, values, allowed);
        if (!step) break;
        rules.push(step.rule);
        values[step.cell] = step.value;
    }
    return {rules, solved: values.every(v => v !== null), values};
}
