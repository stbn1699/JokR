import {describe, expect, it} from "vitest";
import {createDemineur, DEMINEUR_SIZES, demineurCredits, isDemineurCleared, neighbours, placeMines, reveal} from "./demineur.js";

function seeded(seed: number) {
    let state = seed;
    return (max: number) => {
        state = (state * 48271) % 2147483647;
        return state % max;
    };
}

describe("Démineur", () => {
    it("pose les mines au premier clic, jamais sur la case cliquée ni autour", () => {
        const random = seeded(7);
        for (const {size, max} of DEMINEUR_SIZES) {
            const safe = Math.floor(size * size / 2);
            const mines = placeMines(size, max, safe, random);
            expect(mines.size).toBe(max);
            for (const cell of [safe, ...neighbours(safe, size)]) expect(mines.has(cell)).toBe(false);
        }
    });

    it("le premier clic ouvre une zone, puis libérer toutes les cases sans mine gagne", () => {
        const puzzle = createDemineur(10, 15);
        const first = reveal(puzzle, [44], seeded(3));
        expect(first?.kind).toBe("revealed");
        expect(first?.kind === "revealed" && first.cells.length).toBeGreaterThan(1);
        expect(isDemineurCleared(puzzle)).toBe(false);

        const safe = Array.from({length: 100}, (_, c) => c).filter(c => !puzzle.mines!.has(c));
        for (const cell of safe) reveal(puzzle, [cell], seeded(1));
        expect(isDemineurCleared(puzzle)).toBe(true);
    });

    it("une mine libérée fait perdre et montre toutes les mines", () => {
        const puzzle = createDemineur(8, 10);
        reveal(puzzle, [0], seeded(5));
        const mine = [...puzzle.mines!][0];
        const outcome = reveal(puzzle, [mine], seeded(5));
        expect(outcome).toEqual({kind: "exploded", cell: mine, mines: [...puzzle.mines!]});
    });

    it("refuse les cases hors de la grille", () => {
        const puzzle = createDemineur(8, 10);
        expect(reveal(puzzle, [64], seeded(1))).toBeNull();
        expect(reveal(puzzle, [], seeded(1))).toBeNull();
        expect(reveal(puzzle, "0", seeded(1))).toBeNull();
    });

    it("plus de mines rapporte au moins autant de crédits", () => {
        for (const {size, min, max} of DEMINEUR_SIZES) {
            expect(demineurCredits(size, max)).toBeGreaterThanOrEqual(demineurCredits(size, min));
        }
    });
});
