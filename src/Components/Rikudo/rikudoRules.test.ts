import {describe, expect, it} from "vitest";
import {hexBoard, nextHexCell, pathRuns, rikudoConflicts} from "./rikudoRules.ts";

describe("hexBoard", () => {
    it("a le même nombre de cases que le serveur", () => {
        expect([3, 4, 5].map(r => hexBoard(r).size)).toEqual([36, 60, 90]);
    });

    it("range les cases ligne par ligne : 4 cases sur la première ligne d'un plateau de 36", () => {
        const board = hexBoard(3);
        const firstRow = board.centers.filter(([, y]) => y === board.centers[0]![1]);
        expect(firstRow).toHaveLength(4);
    });
});

describe("nextHexCell", () => {
    const board = hexBoard(3);

    it("se déplace dans la ligne et vers la ligne voisine", () => {
        expect(nextHexCell(board, 0, "right", () => true)).toBe(1);
        expect(nextHexCell(board, 0, "left", () => true)).toBeNull();
        const below = nextHexCell(board, 0, "down", () => true)!;
        expect(board.neighbors[0]).toContain(below);
        expect(nextHexCell(board, 0, "up", () => true)).toBeNull();
    });

    it("saute les cases refusées", () => {
        expect(nextHexCell(board, 0, "right", i => i !== 1)).toBe(2);
    });
});

describe("rikudoConflicts", () => {
    const board = hexBoard(3);
    const empty = () => new Array<number | null>(board.size).fill(null);

    it("signale un nombre en double", () => {
        const values = empty();
        values[0] = 5;
        values[10] = 5;
        expect([...rikudoConflicts(board, values, [])].sort((a, b) => a - b)).toEqual([0, 10]);
    });

    it("signale deux nombres consécutifs dans des cases non voisines", () => {
        const values = empty();
        values[0] = 7;
        values[1] = 8; // voisine : correct
        values[35] = 9; // loin de 8 : erreur
        expect(rikudoConflicts(board, values, [])).toEqual(new Set([1, 35]));
    });

    it("signale un point entre deux nombres qui ne se suivent pas", () => {
        const values = empty();
        values[0] = 3;
        values[1] = 6;
        expect(rikudoConflicts(board, values, [[0, 1]])).toEqual(new Set([0, 1]));
        values[1] = 4;
        expect(rikudoConflicts(board, values, [[0, 1]]).size).toBe(0);
    });
});

describe("pathRuns", () => {
    const board = hexBoard(3);

    it("relie les nombres consécutifs posés dans des cases voisines, par morceaux", () => {
        const values = new Array<number | null>(board.size).fill(null);
        values[0] = 1;
        values[1] = 2;
        values[2] = 3; // 1-2-3 sur la première ligne
        values[35] = 4; // loin de 3 : le chemin s'arrête
        values[34] = 5; // 4-5 voisins : nouveau morceau
        expect(pathRuns(values, board.neighbors)).toEqual([[0, 1, 2], [35, 34]]);
    });

    it("coupe le chemin sur un nombre posé deux fois", () => {
        const values = new Array<number | null>(board.size).fill(null);
        values[0] = 1;
        values[1] = 2;
        values[10] = 2;
        expect(pathRuns(values, board.neighbors)).toEqual([]);
    });
});
