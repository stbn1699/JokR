/*
 * Guide du tutoriel des Galaxies : déroule la résolution d'une grille comme le ferait un prof à côté du joueur.
 * On connaît peu à peu le point (la galaxie) de chaque case ; entre deux cases connues de galaxies différentes,
 * le mur est sûr. Seules des déductions qu'on explique en une phrase sont faites :
 * - "core" : les cases qui touchent un point sont à lui (connu dès le départ)
 * - "mirror-of" : la case symétrique d'une case connue, autour de son point, est au même point
 * - "mirror" (technique) : un point ne peut pas prendre une case dont la symétrique sort de la grille
 *   ou est déjà dans une autre galaxie
 * - "reach" (technique) : un point ne peut pas prendre une case qu'il ne peut pas atteindre sans traverser
 *   une autre galaxie
 * Quand il ne reste qu'un point possible pour une case, elle est à lui.
 * Le plan est une suite d'étapes : "learn" (une case trouve son point) et "walls" (murs à tracer autour d'une galaxie).
 * Pur calcul (pas de navigateur) : utilisé aussi par les tests et les scripts de génération.
 */

export type GuideDot = [number, number];
export type GalaxiesGuidePuzzle = { width: number; height: number; dots: GuideDot[]; walls: number[] };

export type GalaxiesTechnique = "mirror" | "reach";

export type GalaxiesStep =
    | { kind: "walls"; dot: number; walls: number[]; spotlight: number[] }
    // why : "mirror-of" (symétrique de la case `from`), "mirror" ou "reach" (technique qui écarte les autres points)
    | { kind: "learn"; cell: number; dot: number; why: "mirror-of" | "mirror" | "reach"; from?: number; spotlight: number[] };

const ALL: GalaxiesTechnique[] = ["mirror", "reach"];

function neighborsOf(width: number, height: number): number[][] {
    return Array.from({length: width * height}, (_, i) => {
        const r = Math.floor(i / width), c = i % width;
        const out: number[] = [];
        if (r > 0) out.push(i - width);
        if (c > 0) out.push(i - 1);
        if (c < width - 1) out.push(i + 1);
        if (r < height - 1) out.push(i + width);
        return out;
    });
}

export function guideWallBetween(a: number, b: number, width: number, height: number): number {
    const [lo, hi] = a < b ? [a, b] : [b, a];
    if (hi - lo === width) return lo;
    const r = Math.floor(lo / width), c = lo % width;
    return (height - 1) * width + r * (width - 1) + c;
}

export function guideMirror(cell: number, dot: GuideDot, width: number, height: number): number {
    const r = dot[0] - 1 - Math.floor(cell / width);
    const c = dot[1] - 1 - (cell % width);
    return r >= 0 && r < height && c >= 0 && c < width ? r * width + c : -1;
}

export function guideCore(dot: GuideDot, width: number): number[] {
    const [y, x] = dot;
    const rows = y % 2 === 1 ? [(y - 1) / 2] : [y / 2 - 1, y / 2];
    const cols = x % 2 === 1 ? [(x - 1) / 2] : [x / 2 - 1, x / 2];
    return rows.flatMap(r => cols.map(c => r * width + c));
}

/**
 * Plan de résolution avec les techniques permises : les étapes dans l'ordre, le point de chaque case trouvé
 * (-1 : inconnu), et si la grille est entièrement découpée (sinon il faut une technique plus avancée).
 */
export function planGalaxies(p: GalaxiesGuidePuzzle, allowed: GalaxiesTechnique[] = ALL): { steps: GalaxiesStep[]; solved: boolean; owner: number[] } {
    const {width, height, dots} = p;
    const n = width * height;
    const neighbors = neighborsOf(width, height);
    const mirrors = dots.map(d => Array.from({length: n}, (_, i) => guideMirror(i, d, width, height)));
    const cores = dots.map(d => guideCore(d, width));
    const hint = new Set(p.walls);

    const owner = Array<number>(n).fill(-1);
    cores.forEach((core, d) => core.forEach(i => (owner[i] = d)));
    const steps: GalaxiesStep[] = [];
    const announced = new Set<number>(hint);

    // cases que le point d peut atteindre sans traverser une autre galaxie ni un mur donné
    const reachable = (d: number) => {
        const seen = new Uint8Array(n);
        const queue = [...cores[d]!];
        queue.forEach(c => (seen[c] = 1));
        while (queue.length) {
            const c = queue.pop()!;
            for (const nb of neighbors[c]!) {
                if (seen[nb] || (owner[nb] !== -1 && owner[nb] !== d) || hint.has(guideWallBetween(c, nb, width, height))) continue;
                seen[nb] = 1;
                queue.push(nb);
            }
        }
        return seen;
    };

    for (let guard = 0; guard < 4 * n; guard++) {
        // 1. murs sûrs (entre deux cases connues de galaxies différentes), autour d'une galaxie à la fois
        const pending: { wall: number; a: number; b: number }[] = [];
        for (let a = 0; a < n; a++) {
            for (const b of neighbors[a]!) {
                if (b <= a || owner[a] === -1 || owner[b] === -1 || owner[a] === owner[b]) continue;
                const wall = guideWallBetween(a, b, width, height);
                if (!announced.has(wall)) pending.push({wall, a, b});
            }
        }
        if (pending.length > 0) {
            // galaxie du dernier point appris d'abord (on finit ce qu'on vient de commencer), sinon le premier point
            const last = [...steps].reverse().find(s => s.kind === "learn");
            const dot = last && pending.some(w => owner[w.a] === last.dot || owner[w.b] === last.dot)
                ? last.dot : Math.min(...pending.flatMap(w => [owner[w.a]!, owner[w.b]!]));
            const chosen = pending.filter(w => owner[w.a] === dot || owner[w.b] === dot);
            chosen.forEach(w => announced.add(w.wall));
            steps.push({
                kind: "walls", dot, walls: chosen.map(w => w.wall),
                spotlight: owner.flatMap((o, i) => (o === dot ? [i] : [])),
            });
            continue;
        }

        // 2. la case symétrique d'une case connue est au même point
        let learned = false;
        for (let i = 0; i < n && !learned; i++) {
            const d = owner[i]!;
            if (d < 0) continue;
            const m = mirrors[d]![i]!;
            if (m >= 0 && owner[m] === -1) {
                owner[m] = d;
                steps.push({kind: "learn", cell: m, dot: d, why: "mirror-of", from: i, spotlight: [i, m]});
                learned = true;
            }
        }
        if (learned) continue;

        // 3. une case à qui il ne reste qu'un point : d'abord avec le miroir seul, puis avec l'accessibilité
        for (const technique of ALL) {
            if (!allowed.includes(technique) || learned) continue;
            const useMirror = allowed.includes("mirror");
            const reach = technique === "reach" ? dots.map((_, d) => reachable(d)) : null;
            for (let i = 0; i < n && !learned; i++) {
                if (owner[i] !== -1) continue;
                const left = dots.flatMap((_, d) => {
                    const m = mirrors[d]![i]!;
                    if (useMirror && (m < 0 || (owner[m] !== -1 && owner[m] !== d))) return [];
                    if (reach && !reach[d]![i]) return [];
                    return [d];
                });
                if (left.length !== 1) continue;
                const d = left[0]!;
                owner[i] = d;
                steps.push({kind: "learn", cell: i, dot: d, why: technique, spotlight: [i, ...cores[d]!]});
                learned = true;
            }
        }
        if (!learned) break;
    }

    return {steps, solved: owner.every(o => o >= 0), owner};
}

// La résolution passe-t-elle par cette déduction ? (pour vérifier qu'une leçon a besoin de sa technique)
export const usesTechnique = (steps: GalaxiesStep[], why: "mirror-of" | "mirror" | "reach") =>
    steps.some(s => s.kind === "learn" && s.why === why);
