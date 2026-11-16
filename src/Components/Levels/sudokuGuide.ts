/*
 * Guide du tutoriel du Sudoku : trouve la prochaine déduction qu'un joueur peut faire, comme le ferait un prof à côté
 * de lui. Le tutoriel s'en sert pour avancer pas à pas, et la génération des niveaux pour noter les grilles.
 * Grille à plat de 81 cases (index = ligne * 9 + colonne), 0 pour une case vide.
 * Pur calcul (pas de navigateur) : utilisé aussi par les tests et les scripts de génération.
 */

export type SudokuRule =
    // une ligne, une colonne ou un carré n'a plus qu'une case vide : elle prend le chiffre qui manque
    | "last"
    // dans ce carré (ou cette ligne, cette colonne), un chiffre n'a plus qu'une place possible
    | "hidden"
    // cette case voit déjà les 8 autres chiffres : il ne lui en reste qu'un
    | "naked";

export type SudokuGroup = { kind: "ligne" | "colonne" | "carré"; cells: number[] };

export type SudokuStep = {
    rule: SudokuRule;
    cell: number;
    digit: number;
    // cases à mettre en lumière (pour comprendre)
    spotlight: number[];
    group?: SudokuGroup["kind"];
};

const ALL: SudokuRule[] = ["last", "hidden", "naked"];

const rowOf = (i: number) => Math.floor(i / 9);
const colOf = (i: number) => i % 9;
const boxOf = (i: number) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

export const SUDOKU_GROUPS: SudokuGroup[] = [
    ...Array.from({length: 9}, (_, b) => ({
        kind: "carré" as const,
        cells: Array.from({length: 9}, (_, k) => (Math.floor(b / 3) * 3 + Math.floor(k / 3)) * 9 + (b % 3) * 3 + (k % 3)),
    })),
    ...Array.from({length: 9}, (_, r) => ({kind: "ligne" as const, cells: Array.from({length: 9}, (_, c) => r * 9 + c)})),
    ...Array.from({length: 9}, (_, c) => ({kind: "colonne" as const, cells: Array.from({length: 9}, (_, r) => r * 9 + c)})),
];

// Les 20 cases qui voient la case i (même ligne, colonne ou carré)
export const peersOf = (i: number) => Array.from({length: 81}, (_, j) => j)
    .filter(j => j !== i && (rowOf(j) === rowOf(i) || colOf(j) === colOf(i) || boxOf(j) === boxOf(i)));

const PEERS = Array.from({length: 81}, (_, i) => peersOf(i));

/**
 * Prochaine déduction, par ordre de simplicité (seulement parmi `allowed`), ou null s'il n'y en a plus avec ces
 * règles (grille finie, ou il faut une technique plus avancée).
 */
export function nextSudokuStep(values: number[], allowed: SudokuRule[] = ALL): SudokuStep | null {
    const sees = (i: number, d: number) => PEERS[i]!.some(j => values[j] === d);

    if (allowed.includes("last")) {
        for (const g of SUDOKU_GROUPS) {
            const empties = g.cells.filter(i => values[i] === 0);
            if (empties.length !== 1) continue;
            const digit = [1, 2, 3, 4, 5, 6, 7, 8, 9].find(d => !g.cells.some(i => values[i] === d))!;
            return {rule: "last", cell: empties[0]!, digit, spotlight: g.cells, group: g.kind};
        }
    }

    if (allowed.includes("hidden")) {
        for (const g of SUDOKU_GROUPS) {
            for (let d = 1; d <= 9; d++) {
                if (g.cells.some(i => values[i] === d)) continue;
                const places = g.cells.filter(i => values[i] === 0 && !sees(i, d));
                if (places.length !== 1) continue;
                // les chiffres d qui bloquent les autres cases vides du groupe
                const witnesses = new Set<number>();
                for (const i of g.cells) {
                    if (values[i] !== 0 || i === places[0]) continue;
                    const w = PEERS[i]!.find(j => values[j] === d && !g.cells.includes(j));
                    if (w !== undefined) witnesses.add(w);
                }
                return {rule: "hidden", cell: places[0]!, digit: d, spotlight: [...g.cells, ...witnesses], group: g.kind};
            }
        }
    }

    if (allowed.includes("naked")) {
        for (let i = 0; i < 81; i++) {
            if (values[i] !== 0) continue;
            const left = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => !sees(i, d));
            if (left.length === 1) return {rule: "naked", cell: i, digit: left[0]!, spotlight: [i, ...PEERS[i]!]};
        }
    }
    return null;
}

// Résout avec les règles permises : règles utilisées dans l'ordre, et si la grille est finie
export function solveSudokuWithGuide(start: number[], allowed: SudokuRule[] = ALL): { rules: SudokuRule[]; solved: boolean; values: number[] } {
    const values = [...start];
    const rules: SudokuRule[] = [];
    for (let guard = 0; guard < 81; guard++) {
        const step = nextSudokuStep(values, allowed);
        if (!step) break;
        rules.push(step.rule);
        values[step.cell] = step.digit;
    }
    return {rules, solved: values.every(v => v !== 0), values};
}
