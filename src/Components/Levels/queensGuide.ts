/*
 * Guide du tutoriel du Queens : trouve la prochaine déduction qu'un joueur peut faire sur la grille, comme le ferait
 * un prof à côté de lui. Le tutoriel s'en sert pour avancer pas à pas (cases mises en lumière, cases à marquer, texte),
 * et la génération des niveaux pour choisir des grilles qui obligent à utiliser la leçon du niveau.
 * Pur calcul (pas de navigateur) : utilisé aussi par un script de génération.
 */

export type GuideMark = 0 | 1 | 2; // 0 vide, 1 croix, 2 dame
export type GuidePuzzle = { size: number; regions: number[]; queens: number[] };

export type GuideRule =
    // une dame posée bloque sa ligne, sa colonne, sa zone et les cases qui la touchent
    | "attacks"
    // une ligne, une colonne ou une zone n'a plus qu'une case libre
    | "single"
    // une zone tient sur une seule ligne (ou colonne) : le reste de cette ligne est barré
    | "confined1"
    // deux zones tiennent sur les deux mêmes lignes (ou colonnes) : le reste de ces lignes est barré
    | "confined2"
    // une dame sur cette case viderait une autre ligne, colonne ou zone
    | "blocked";

export type GuideStep = {
    rule: GuideRule;
    // cases à mettre en lumière (pour comprendre), cases à marquer, et la marque attendue
    spotlight: number[];
    targets: number[];
    mark: "cross" | "queen";
    // ligne / colonne / zone concernée (texte)
    line?: "ligne" | "colonne" | "zone";
};

const rowOf = (n: number, i: number) => Math.floor(i / n);
const colOf = (n: number, i: number) => i % n;

// La case b est-elle interdite par une dame en a ?
function attacks(p: GuidePuzzle, a: number, b: number): boolean {
    const n = p.size;
    if (a === b) return false;
    return rowOf(n, a) === rowOf(n, b) || colOf(n, a) === colOf(n, b) || p.regions[a] === p.regions[b]
        || (Math.abs(rowOf(n, a) - rowOf(n, b)) <= 1 && Math.abs(colOf(n, a) - colOf(n, b)) <= 1);
}

type Group = { kind: "ligne" | "colonne" | "zone"; cells: number[] };

function groups(p: GuidePuzzle): Group[] {
    const n = p.size;
    const out: Group[] = [];
    for (let k = 0; k < n; k++) out.push({kind: "ligne", cells: Array.from({length: n}, (_, c) => k * n + c)});
    for (let k = 0; k < n; k++) out.push({kind: "colonne", cells: Array.from({length: n}, (_, r) => r * n + k)});
    for (let k = 0; k < n; k++) out.push({kind: "zone", cells: p.regions.map((z, i) => (z === k ? i : -1)).filter(i => i >= 0)});
    return out;
}

// Marques de départ : les dames données
export function startMarks(p: GuidePuzzle): GuideMark[] {
    return Array.from({length: p.size * p.size}, (_, i) => (p.queens.includes(i) ? 2 : 0));
}

const ALL: GuideRule[] = ["attacks", "single", "confined1", "confined2", "blocked"];

/**
 * Prochaine déduction, par ordre de simplicité (seulement parmi `allowed`), ou null si plus rien à déduire avec ces
 * règles (grille finie, ou il faut une technique plus avancée).
 */
export function nextStep(p: GuidePuzzle, marks: GuideMark[], allowed: GuideRule[] = ALL): GuideStep | null {
    const n = p.size;
    const open = (i: number) => marks[i] === 0;
    const queens = marks.map((m, i) => (m === 2 ? i : -1)).filter(i => i >= 0);
    const gs = groups(p);

    if (allowed.includes("attacks")) {
        for (const q of queens) {
            const targets = marks.map((_, i) => (open(i) && attacks(p, q, i) ? i : -1)).filter(i => i >= 0);
            if (targets.length > 0) return {rule: "attacks", spotlight: [q, ...targets], targets, mark: "cross"};
        }
    }

    if (allowed.includes("single")) {
        for (const g of gs) {
            if (g.cells.some(i => marks[i] === 2)) continue;
            const free = g.cells.filter(open);
            if (free.length === 1) return {rule: "single", spotlight: g.cells, targets: free, mark: "queen", line: g.kind};
        }
    }

    // k zones dont les cases libres tiennent sur k lignes (ou colonnes) : ces lignes leur reviennent
    for (const k of [1, 2] as const) {
        if (!allowed.includes(k === 1 ? "confined1" : "confined2")) continue;
        const zones = Array.from({length: n}, (_, z) => z)
            .filter(z => !p.regions.some((r, i) => r === z && marks[i] === 2));
        const combos: number[][] = k === 1 ? zones.map(z => [z])
            : zones.flatMap((a, x) => zones.slice(x + 1).map(b => [a, b]));
        for (const combo of combos) {
            const cells = p.regions.map((r, i) => (combo.includes(r) && open(i) ? i : -1)).filter(i => i >= 0);
            if (cells.length === 0) continue;
            for (const [axis, line] of [["ligne", rowOf], ["colonne", colOf]] as const) {
                const lines = new Set(cells.map(i => line(n, i)));
                if (lines.size !== k) continue;
                const targets = marks.map((_, i) => (open(i) && lines.has(line(n, i)) && !combo.includes(p.regions[i]!) ? i : -1))
                    .filter(i => i >= 0);
                if (targets.length > 0) {
                    return {rule: k === 1 ? "confined1" : "confined2", spotlight: cells, targets, mark: "cross", line: axis};
                }
            }
        }
    }

    if (allowed.includes("blocked")) {
        for (let i = 0; i < n * n; i++) {
            if (!open(i)) continue;
            const empties = gs.find(g => !g.cells.includes(i) && !g.cells.some(j => marks[j] === 2)
                && g.cells.filter(open).every(j => attacks(p, i, j)));
            if (empties) return {rule: "blocked", spotlight: [i, ...empties.cells], targets: [i], mark: "cross", line: empties.kind};
        }
    }
    return null;
}

// Applique une déduction
export function applyStep(marks: GuideMark[], step: GuideStep): GuideMark[] {
    const next = [...marks];
    for (const t of step.targets) next[t] = step.mark === "queen" ? 2 : 1;
    return next;
}

// Résout avec les règles permises : règles utilisées dans l'ordre, et si la grille est finie
export function solveWithGuide(p: GuidePuzzle, allowed: GuideRule[] = ALL): { rules: GuideRule[]; solved: boolean } {
    let marks = startMarks(p);
    const rules: GuideRule[] = [];
    for (let guard = 0; guard < 400; guard++) {
        const step = nextStep(p, marks, allowed);
        if (!step) break;
        rules.push(step.rule);
        marks = applyStep(marks, step);
    }
    return {rules, solved: marks.filter(m => m === 2).length === p.size};
}
