import {describe, expect, it} from "vitest";
import type {BouclePuzzle} from "../../Models/boucle.model.ts";
import {cleanLinks, countLoops, fullCells, linkKey, solvedLoop, startStroke, strokeTo} from "./boucleRules.ts";

const open = (size: number, walls: [number, number][] = []): BouclePuzzle => ({size, walls});
const draw = (puzzle: BouclePuzzle, links: number[], cells: number[]) => {
    let stroke = startStroke(links, cells[0]!);
    for (const cell of cells.slice(1)) stroke = strokeTo(puzzle, stroke, cell);
    return stroke.links;
};

describe("Tracé de Boucle", () => {
    it("trace une boucle complète", () => {
        const puzzle = open(2);
        const links = draw(puzzle, [], [0, 1, 3, 2, 0]);
        expect(links).toHaveLength(4);
        expect(solvedLoop(puzzle, links)).toHaveLength(4);
    });

    it("ne traverse pas un mur", () => {
        const puzzle = open(2, [[0, 1]]);
        expect(draw(puzzle, [], [0, 1])).toEqual([]);
    });

    it("suit le doigt quand il saute plusieurs cases", () => {
        expect(draw(open(4), [], [0, 3])).toHaveLength(3);
    });

    it("revenir en arrière retire ce que le geste vient de tracer", () => {
        expect(draw(open(4), [], [0, 1, 2, 1])).toEqual([linkKey(0, 1, 4)]);
    });

    it("rend le lien coupé si on revient en arrière", () => {
        const puzzle = open(3);
        const base = draw(puzzle, [], [3, 4, 5]);
        const during = draw(puzzle, base, [1, 4]);
        expect(during).toHaveLength(2);
        expect(new Set(draw(puzzle, base, [1, 4, 1]))).toEqual(new Set(base));
    });

    it("efface en glissant sur un lien existant", () => {
        const puzzle = open(3);
        const base = draw(puzzle, [], [0, 1, 2]);
        expect(draw(puzzle, base, [0, 1])).toEqual([linkKey(1, 2, 3)]);
    });

    it("ne valide pas deux boucles séparées", () => {
        const puzzle = open(4);
        const left = draw(puzzle, [], [0, 1, 5, 9, 13, 12, 8, 4, 0]);
        const links = draw(puzzle, left, [2, 3, 7, 11, 15, 14, 10, 6, 2]);
        expect(fullCells(links, 4)).toBe(16);
        expect(countLoops(links, 4)).toBe(2);
        expect(solvedLoop(puzzle, links)).toBeNull();
    });

    it("écarte les liens impossibles à la reprise", () => {
        const puzzle = open(2, [[0, 1]]);
        expect(cleanLinks(puzzle, [linkKey(0, 1, 2), linkKey(0, 2, 2), linkKey(0, 3, 2), "x", 999])).toEqual([linkKey(0, 2, 2)]);
    });
});
