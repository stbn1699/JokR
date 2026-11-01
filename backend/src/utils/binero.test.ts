import {describe, expect, it} from "vitest";
import {
    type BineroGrid,
    countBineroClues,
    EMPTY,
    generateBinero,
    generateSolution,
    isConsistent,
    isValidSolution,
    logicalSolve,
} from "./binero.js";

// Vérification des règles écrite indépendamment du moteur
function followsRules(grid: BineroGrid): boolean {
    const size = grid.length;
    const cols = grid.map((_, c) => grid.map(row => row[c]!));
    for (const lines of [grid, cols]) {
        const seen = new Set<string>();
        for (const line of lines) {
            if (line.filter(v => v === 0).length !== size / 2) return false;
            if (line.filter(v => v === 1).length !== size / 2) return false;
            if (/000|111/.test(line.join(""))) return false;
            if (seen.has(line.join(""))) return false;
            seen.add(line.join(""));
        }
    }
    return true;
}

// Compte les solutions par force brute (s'arrête à `max`)
function countSolutions(puzzle: BineroGrid, max = 2): number {
    const grid = puzzle.map(r => r.slice());
    const size = grid.length;
    let count = 0;
    const walk = (cell: number) => {
        if (count >= max) return;
        if (cell === size * size) {
            count++;
            return;
        }
        const r = Math.floor(cell / size), c = cell % size;
        if (grid[r]![c] !== EMPTY) return walk(cell + 1);
        for (const v of [0, 1]) {
            grid[r]![c] = v;
            if (isConsistent(grid)) walk(cell + 1);
        }
        grid[r]![c] = EMPTY;
    };
    walk(0);
    return count;
}

describe("generateSolution", () => {
    it("produit une grille complète qui respecte les trois règles, pour chaque taille", () => {
        for (const size of [6, 8, 10, 12]) {
            const grid = generateSolution(size);
            expect(grid).toHaveLength(size);
            expect(followsRules(grid)).toBe(true);
            expect(isValidSolution(grid)).toBe(true);
        }
    });

    it("refuse une taille impaire", () => {
        expect(() => generateSolution(7)).toThrow();
    });
});

describe("isValidSolution", () => {
    const valid = generateSolution(6);
    const clone = () => valid.map(r => r.slice());

    it("refuse trois chiffres identiques côte à côte", () => {
        // On cherche une ligne "x y y" et on force un triplet
        const g = clone();
        const row = g[0]!;
        const i = row.findIndex((v, k) => k >= 1 && k <= 4 && row[k + 1] === v);
        if (i > 0) {
            row[i - 1] = row[i]!;
            expect(isValidSolution(g)).toBe(false);
        }
    });

    it("refuse une ligne déséquilibrée", () => {
        const g = clone();
        g[2]![0] = 1 - g[2]![0]!;
        expect(isValidSolution(g)).toBe(false);
    });

    it("refuse deux lignes identiques", () => {
        const g = clone();
        g[1] = g[0]!.slice();
        expect(isValidSolution(g)).toBe(false);
    });

    it("refuse une case vide", () => {
        const g = clone();
        g[3]![3] = EMPTY;
        expect(isValidSolution(g)).toBe(false);
    });

    it("est d'accord avec la vérification indépendante sur des grilles tirées au hasard", () => {
        for (let i = 0; i < 20; i++) {
            const g = generateSolution(6);
            expect(isValidSolution(g)).toBe(followsRules(g));
        }
    });
});

describe("generateBinero", () => {
    it("tombe pile sur le nombre de chiffres demandé", () => {
        expect(countBineroClues(generateBinero(6, 18))).toBe(18);
        expect(countBineroClues(generateBinero(8, 32))).toBe(32);
    });

    it("produit une grille à solution unique (vérifié par force brute)", () => {
        for (let i = 0; i < 5; i++) {
            const puzzle = generateBinero(6, 11);
            expect(countSolutions(puzzle)).toBe(1);
        }
    });

    it("produit une grille que la résolution logique termine, avec une solution valide", () => {
        const puzzle = generateBinero(10, 40);
        const {solved, grid} = logicalSolve(puzzle);
        expect(solved).toBe(true);
        expect(followsRules(grid)).toBe(true);
        // les chiffres de départ sont conservés
        puzzle.forEach((row, r) => row.forEach((v, c) => {
            if (v !== EMPTY) expect(grid[r]![c]).toBe(v);
        }));
    });

    it("reste rapide sur la grille la plus difficile proposée (12×12, 80 cases à remplir)", () => {
        const start = Date.now();
        generateBinero(12, 144 - 80);
        expect(Date.now() - start).toBeLessThan(2000);
    });
});
