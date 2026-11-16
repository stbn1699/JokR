/*
 * Guide du tutoriel du Binero : trouve la prochaine déduction qu'un joueur peut faire, comme le ferait un prof à côté
 * de lui. Le tutoriel s'en sert pour avancer pas à pas, et la génération des niveaux pour choisir des grilles qui
 * obligent à utiliser la leçon du niveau.
 * Grille à plat (index = ligne * taille + colonne), null pour une case vide.
 * Pur calcul (pas de navigateur) : utilisé aussi par les tests et les scripts de génération.
 */

export type BineroValue = 0 | 1 | null;

export type BineroRule =
    // deux chiffres pareils côte à côte : les cases qui les touchent dans la ligne prennent l'autre chiffre
    | "pair"
    // deux chiffres pareils séparés par une case vide : le milieu prend l'autre chiffre
    | "sandwich"
    // une ligne a déjà la moitié de ses cases avec le même chiffre : le reste prend l'autre
    | "count"
    // une ligne à qui il manque deux chiffres ressemble à une ligne complète : on la complète à l'envers
    | "duplicate";

export type BineroStep = {
    rule: BineroRule;
    // cases à mettre en lumière (pour comprendre), et cases à remplir avec leur chiffre
    spotlight: number[];
    targets: { cell: number; digit: 0 | 1 }[];
    line: "ligne" | "colonne";
    // "duplicate" : la ligne complète qui sert de modèle
    model?: number[];
};

const ALL: BineroRule[] = ["pair", "sandwich", "count", "duplicate"];

function linesOf(size: number): { kind: "ligne" | "colonne"; cells: number[] }[] {
    const out: { kind: "ligne" | "colonne"; cells: number[] }[] = [];
    for (let r = 0; r < size; r++) out.push({kind: "ligne", cells: Array.from({length: size}, (_, c) => r * size + c)});
    for (let c = 0; c < size; c++) out.push({kind: "colonne", cells: Array.from({length: size}, (_, r) => r * size + c)});
    return out;
}

/**
 * Prochaine déduction, par ordre de simplicité (seulement parmi `allowed`), ou null s'il n'y en a plus avec ces
 * règles (grille finie, ou il faut une technique plus avancée).
 */
export function nextBineroStep(size: number, values: BineroValue[], allowed: BineroRule[] = ALL): BineroStep | null {
    const lines = linesOf(size);
    const half = size / 2;
    const v = (i: number) => values[i] ?? null;
    const other = (d: 0 | 1) => (1 - d) as 0 | 1;

    if (allowed.includes("pair")) {
        for (const {kind, cells} of lines) {
            for (let k = 0; k + 1 < size; k++) {
                const d = v(cells[k]!);
                if (d === null || v(cells[k + 1]!) !== d) continue;
                const ends = [cells[k - 1], cells[k + 2]].filter((i): i is number => i !== undefined && v(i) === null);
                if (ends.length > 0) {
                    return {rule: "pair", spotlight: [cells[k]!, cells[k + 1]!], targets: ends.map(cell => ({cell, digit: other(d)})), line: kind};
                }
            }
        }
    }

    if (allowed.includes("sandwich")) {
        for (const {kind, cells} of lines) {
            for (let k = 0; k + 2 < size; k++) {
                const d = v(cells[k]!);
                if (d === null || v(cells[k + 2]!) !== d || v(cells[k + 1]!) !== null) continue;
                return {rule: "sandwich", spotlight: [cells[k]!, cells[k + 2]!], targets: [{cell: cells[k + 1]!, digit: other(d)}], line: kind};
            }
        }
    }

    if (allowed.includes("count")) {
        for (const {kind, cells} of lines) {
            const empties = cells.filter(i => v(i) === null);
            if (empties.length === 0) continue;
            for (const d of [0, 1] as const) {
                if (cells.filter(i => v(i) === d).length === half) {
                    return {rule: "count", spotlight: cells, targets: empties.map(cell => ({cell, digit: other(d)})), line: kind};
                }
            }
        }
    }

    if (allowed.includes("duplicate")) {
        for (const kind of ["ligne", "colonne"] as const) {
            const group = lines.filter(l => l.kind === kind);
            const complete = group.filter(l => l.cells.every(i => v(i) !== null));
            for (const {cells} of group) {
                const empties = cells.filter(i => v(i) === null);
                if (empties.length !== 2) continue;
                // il manque forcément un 0 et un 1 (sinon le comptage suffirait)
                if (cells.filter(i => v(i) === 0).length !== half - 1) continue;
                const model = complete.find(m => cells.every((i, k) => v(i) === null || v(i) === v(m.cells[k]!)));
                if (!model) continue;
                return {
                    rule: "duplicate", spotlight: [...cells, ...model.cells], model: model.cells, line: kind,
                    targets: empties.map(cell => ({cell, digit: other(v(model.cells[cells.indexOf(cell)]!)!)})),
                };
            }
        }
    }
    return null;
}

// Applique une déduction
export function applyBineroStep(values: BineroValue[], step: BineroStep): BineroValue[] {
    const next = [...values];
    for (const t of step.targets) next[t.cell] = t.digit;
    return next;
}

// Résout avec les règles permises : règles utilisées dans l'ordre, et si la grille est finie
export function solveBineroWithGuide(size: number, start: BineroValue[], allowed: BineroRule[] = ALL): { rules: BineroRule[]; solved: boolean; values: BineroValue[] } {
    let values = [...start];
    const rules: BineroRule[] = [];
    for (let guard = 0; guard < size * size; guard++) {
        const step = nextBineroStep(size, values, allowed);
        if (!step) break;
        rules.push(step.rule);
        values = applyBineroStep(values, step);
    }
    return {rules, solved: values.every(x => x !== null), values};
}
