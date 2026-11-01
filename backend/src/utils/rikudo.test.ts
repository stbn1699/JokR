import {describe, expect, it} from "vitest";
import {areNeighbors, generateRikudo, isRikudoSolution, randomPath, rikudoBoard, rikudoSize, solveRikudo} from "./rikudo.js";
import {RIKUDO_SIZES, RikudoService} from "../services/Rikudo.service.js";

describe("rikudoBoard", () => {
    it("compte 36, 60 et 90 cases (sans la case centrale)", () => {
        expect([3, 4, 5].map(r => rikudoBoard(r).size)).toEqual([36, 60, 90]);
        expect([3, 4, 5].map(rikudoSize)).toEqual([36, 60, 90]);
    });

    it("donne 6 voisins au plus, symétriques", () => {
        const board = rikudoBoard(3);
        board.neighbors.forEach((list, c) => {
            expect(list.length).toBeLessThanOrEqual(6);
            for (const n of list) expect(board.neighbors[n]).toContain(c);
        });
        // Les 6 cases autour du trou central n'ont que 5 voisins
        expect(board.neighbors.filter(l => l.length === 5).length).toBeGreaterThanOrEqual(6);
    });
});

describe("randomPath", () => {
    it("passe une fois par chaque case, de voisine en voisine", () => {
        const board = rikudoBoard(4);
        const path = randomPath(board);
        expect(new Set(path).size).toBe(board.size);
        for (let i = 1; i < path.length; i++) expect(areNeighbors(board, path[i - 1]!, path[i]!)).toBe(true);
    });
});

describe("generateRikudo", () => {
    const service = new RikudoService();

    it.each(RIKUDO_SIZES.map(s => [s.size, s.size - s.maxEmptyCells] as const))(
        "grille de %i cases à solution unique (%i nombres donnés)", (size, clues) => {
            const puzzle = service.generate(size, clues);
            expect(puzzle.cells).toHaveLength(size);
            expect(puzzle.cells.filter(v => v !== null).length).toBeGreaterThanOrEqual(clues);
            // 1 et N toujours donnés
            expect(puzzle.cells).toContain(1);
            expect(puzzle.cells).toContain(size);

            const {solutions, complete} = solveRikudo(puzzle, 2);
            expect(complete).toBe(true);
            expect(solutions).toHaveLength(1);

            const values = new Array<number>(size);
            solutions[0]!.forEach((cell, i) => (values[cell] = i + 1));
            expect(isRikudoSolution(puzzle, values)).toBe(true);
        });

    it("abandonne si trop de liens sont nécessaires", () => {
        expect(generateRikudo(3, 2, 0)).toBeNull();
    });
});

describe("isRikudoSolution", () => {
    const puzzle = new RikudoService().generate(36, 14);
    const values = new Array<number>(36);
    solveRikudo(puzzle, 1).solutions[0]!.forEach((cell, i) => (values[cell] = i + 1));

    it("accepte la solution", () => {
        expect(isRikudoSolution(puzzle, values)).toBe(true);
    });

    it("refuse une grille incomplète, mal formée ou avec un doublon", () => {
        expect(isRikudoSolution(puzzle, values.slice(1))).toBe(false);
        expect(isRikudoSolution(puzzle, values.map(v => String(v)))).toBe(false);
        expect(isRikudoSolution(puzzle, values.map(v => (v === 2 ? 3 : v)))).toBe(false);
    });

    it("refuse deux nombres consécutifs éloignés", () => {
        // Échange de deux cases à trouver : le chemin est cassé (ou un nombre donné est déplacé)
        const free = puzzle.cells.flatMap((v, c) => (v === null ? [c] : []));
        const swapped = values.slice();
        [swapped[free[0]!], swapped[free.at(-1)!]] = [swapped[free.at(-1)!]!, swapped[free[0]!]!];
        expect(isRikudoSolution(puzzle, swapped)).toBe(false);
    });
});
