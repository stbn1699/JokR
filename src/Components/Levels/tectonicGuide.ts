/*
 * Guide du tutoriel du Tectonic : trouve la prochaine déduction qu'un joueur peut faire, comme le ferait un prof à
 * côté de lui. Le tutoriel s'en sert pour avancer pas à pas, et la génération des niveaux pour noter les grilles.
 * Grille à plat (index = ligne * largeur + colonne), null pour une case vide ; regions[i] : zone de la case.
 * Pur calcul (pas de navigateur) : utilisé aussi par les tests et les scripts de génération.
 */

export type TectonicGuidePuzzle = { width: number; height: number; regions: number[] };

export type TectonicRule =
    // une zone n'a plus qu'une case vide : elle prend le nombre qui manque
    | "last"
    // dans cette zone, un nombre n'a plus qu'une case possible (les autres touchent déjà ce nombre)
    | "hidden"
    // cette case ne peut prendre qu'un nombre (les autres sont dans sa zone ou la touchent)
    | "naked";

export type TectonicStep = {
    rule: TectonicRule;
    cell: number;
    digit: number;
    // cases à mettre en lumière (pour comprendre)
    spotlight: number[];
};

const ALL: TectonicRule[] = ["last", "hidden", "naked"];

// Les cases qui touchent la case i, diagonales comprises
export function touching(i: number, width: number, height: number): number[] {
    const r = Math.floor(i / width), c = i % width;
    const out: number[] = [];
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if ((dr || dc) && r + dr >= 0 && r + dr < height && c + dc >= 0 && c + dc < width) out.push((r + dr) * width + c + dc);
        }
    }
    return out;
}

/**
 * Prochaine déduction, par ordre de simplicité (seulement parmi `allowed`), ou null s'il n'y en a plus avec ces
 * règles (grille finie, ou il faut une technique plus avancée).
 */
export function nextTectonicStep(p: TectonicGuidePuzzle, values: (number | null)[], allowed: TectonicRule[] = ALL): TectonicStep | null {
    const {width, height, regions} = p;
    const n = width * height;
    const zones = new Map<number, number[]>();
    regions.forEach((z, i) => zones.set(z, [...(zones.get(z) ?? []), i]));
    const near = Array.from({length: n}, (_, i) => touching(i, width, height));
    const blocked = (i: number, d: number) => near[i]!.some(j => values[j] === d);

    if (allowed.includes("last")) {
        for (const cells of zones.values()) {
            const empties = cells.filter(i => values[i] === null);
            if (empties.length !== 1) continue;
            const digit = Array.from({length: cells.length}, (_, k) => k + 1).find(d => !cells.some(i => values[i] === d))!;
            return {rule: "last", cell: empties[0]!, digit, spotlight: cells};
        }
    }

    if (allowed.includes("hidden")) {
        for (const cells of zones.values()) {
            for (let d = 1; d <= cells.length; d++) {
                if (cells.some(i => values[i] === d)) continue;
                const places = cells.filter(i => values[i] === null && !blocked(i, d));
                if (places.length !== 1) continue;
                // les d voisins qui bloquent les autres cases vides de la zone
                const witnesses = new Set<number>();
                for (const i of cells) {
                    if (values[i] !== null || i === places[0]) continue;
                    const w = near[i]!.find(j => values[j] === d && !cells.includes(j));
                    if (w !== undefined) witnesses.add(w);
                }
                return {rule: "hidden", cell: places[0]!, digit: d, spotlight: [...cells, ...witnesses]};
            }
        }
    }

    if (allowed.includes("naked")) {
        for (let i = 0; i < n; i++) {
            if (values[i] !== null) continue;
            const zone = zones.get(regions[i]!)!;
            const left = Array.from({length: zone.length}, (_, k) => k + 1)
                .filter(d => !zone.some(j => values[j] === d) && !blocked(i, d));
            if (left.length === 1) return {rule: "naked", cell: i, digit: left[0]!, spotlight: [...new Set([i, ...zone, ...near[i]!])]};
        }
    }
    return null;
}

// Résout avec les règles permises : règles utilisées dans l'ordre, et si la grille est finie
export function solveTectonicWithGuide(p: TectonicGuidePuzzle, start: (number | null)[], allowed: TectonicRule[] = ALL): { rules: TectonicRule[]; solved: boolean; values: (number | null)[] } {
    const values = [...start];
    const rules: TectonicRule[] = [];
    for (let guard = 0; guard < values.length; guard++) {
        const step = nextTectonicStep(p, values, allowed);
        if (!step) break;
        rules.push(step.rule);
        values[step.cell] = step.digit;
    }
    return {rules, solved: values.every(v => v !== null), values};
}
