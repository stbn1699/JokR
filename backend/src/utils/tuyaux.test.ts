import {describe, expect, it} from "vitest";
import {generateTuyaux, isTuyauxSolution, isTuyauxSolved, rotateTile, TUYAUX_SIZES} from "./tuyaux.js";

function seeded(seed: number) {
    let state = seed;
    return (max: number) => {
        state = (state * 48271) % 2147483647;
        return state % max;
    };
}

// Quarts de tour qui ramènent chaque pièce sur la solution
const solvingTurns = (tiles: number[], solution: number[]) =>
    tiles.map((tile, i) => [0, 1, 2, 3].find(t => rotateTile(tile, t) === solution[i])!);

describe("Tuyaux", () => {
    it("tourne une pièce d'un quart de tour", () => {
        expect(rotateTile(1, 1)).toBe(2);
        expect(rotateTile(8, 1)).toBe(1);
        expect(rotateTile(3, 3)).toBe(9);
        expect(rotateTile(5, 2)).toBe(5);
        expect(rotateTile(6, -1)).toBe(3);
    });

    it("reconnaît un réseau complet, sans boucle ni sortie ouverte", () => {
        // 2×2 en U : haut-gauche → bas-gauche → bas-droite → haut-droite
        expect(isTuyauxSolved([4, 4, 3, 9], 2)).toBe(true);
        // boucle
        expect(isTuyauxSolved([6, 12, 3, 9], 2)).toBe(false);
        // sortie vers le bord
        expect(isTuyauxSolved([5, 4, 3, 9], 2)).toBe(false);
        // deux réseaux séparés
        expect(isTuyauxSolved([4, 4, 1, 1], 2)).toBe(false);
    });

    it("génère des grilles mélangées et résolubles, à chaque taille", () => {
        const random = seeded(19);
        for (const {size, max} of TUYAUX_SIZES) {
            for (const hints of [0, max]) {
                const puzzle = generateTuyaux(size, hints, random);
                expect(puzzle.tiles).toHaveLength(size * size);
                expect(puzzle.locked).toHaveLength(hints);
                expect(isTuyauxSolved(puzzle.solution, size)).toBe(true);
                expect(isTuyauxSolved(puzzle.tiles, size)).toBe(false);
                puzzle.locked.forEach(cell => expect(puzzle.tiles[cell]).toBe(puzzle.solution[cell]));
                expect(isTuyauxSolution(puzzle, solvingTurns(puzzle.tiles, puzzle.solution))).toBe(true);
            }
        }
    });

    it("refuse une pièce donnée tournée et des valeurs invalides", () => {
        const puzzle = generateTuyaux(5, 3, seeded(4));
        const turns = solvingTurns(puzzle.tiles, puzzle.solution);
        const moved = [...turns];
        moved[puzzle.locked[0]!] = 1;
        expect(isTuyauxSolution(puzzle, moved)).toBe(false);
        expect(isTuyauxSolution(puzzle, turns.slice(1))).toBe(false);
        expect(isTuyauxSolution(puzzle, turns.map(() => 7))).toBe(false);
        expect(isTuyauxSolution(puzzle, "0")).toBe(false);
    });
});
