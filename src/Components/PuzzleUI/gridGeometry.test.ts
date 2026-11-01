import {describe, expect, it} from "vitest";
import {isPeer, nextEditableIndex} from "./gridGeometry.ts";

const at = (row: number, col: number) => row * 9 + col;

describe("isPeer", () => {
    it("reconnaît la même ligne, colonne ou bloc (Sudoku)", () => {
        expect(isPeer(at(4, 4), at(4, 0), 9, 3)).toBe(true); // ligne
        expect(isPeer(at(4, 4), at(8, 4), 9, 3)).toBe(true); // colonne
        expect(isPeer(at(4, 4), at(3, 5), 9, 3)).toBe(true); // bloc central
    });

    it("sans blocs, seulement la ligne et la colonne (Binero)", () => {
        const at6 = (row: number, col: number) => row * 6 + col;
        expect(isPeer(at6(2, 2), at6(2, 5), 6)).toBe(true);
        expect(isPeer(at6(2, 2), at6(5, 2), 6)).toBe(true);
        expect(isPeer(at6(2, 2), at6(3, 3), 6)).toBe(false);
    });

    it("exclut la case elle-même et les autres cases", () => {
        expect(isPeer(at(4, 4), at(4, 4), 9, 3)).toBe(false);
        expect(isPeer(at(4, 4), at(0, 0), 9, 3)).toBe(false);
        expect(isPeer(at(4, 4), at(2, 6), 9, 3)).toBe(false);
    });

    it("donne 20 voisines pour chaque case du Sudoku, 2×(size-1) sans blocs", () => {
        for (const cell of [0, 40, 80]) {
            const peers = Array.from({length: 81}, (_, i) => i).filter(i => isPeer(cell, i, 9, 3));
            expect(peers).toHaveLength(20);
        }
        const peers10 = Array.from({length: 100}, (_, i) => i).filter(i => isPeer(55, i, 10));
        expect(peers10).toHaveLength(18);
    });
});

describe("nextEditableIndex", () => {
    const all = () => true;

    it("va à la case voisine quand elle est modifiable", () => {
        expect(nextEditableIndex(at(2, 3), "right", all)).toBe(at(2, 4));
        expect(nextEditableIndex(at(2, 3), "left", all)).toBe(at(2, 2));
        expect(nextEditableIndex(at(2, 3), "up", all)).toBe(at(1, 3));
        expect(nextEditableIndex(at(2, 3), "down", all)).toBe(at(3, 3));
    });

    it("revient au début de la ligne ou de la colonne au bord", () => {
        expect(nextEditableIndex(at(5, 8), "right", all)).toBe(at(5, 0));
        expect(nextEditableIndex(at(5, 0), "left", all)).toBe(at(5, 8));
        expect(nextEditableIndex(at(0, 2), "up", all)).toBe(at(8, 2));
        expect(nextEditableIndex(at(8, 2), "down", all)).toBe(at(0, 2));
    });

    it("saute les indices", () => {
        const editable = new Set([at(0, 1), at(0, 6)]);
        expect(nextEditableIndex(at(0, 1), "right", i => editable.has(i))).toBe(at(0, 6));
        // en revenant par le bord gauche
        expect(nextEditableIndex(at(0, 6), "right", i => editable.has(i))).toBe(at(0, 1));
    });

    it("fonctionne sur une autre taille de grille", () => {
        expect(nextEditableIndex(5, "right", all, 6)).toBe(0);
        expect(nextEditableIndex(0, "up", all, 6)).toBe(30);
    });

    it("renvoie null s'il n'y a pas d'autre case modifiable sur la ligne", () => {
        expect(nextEditableIndex(at(3, 3), "right", i => i === at(3, 3))).toBeNull();
    });
});
