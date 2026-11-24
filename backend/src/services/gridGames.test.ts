import {describe, expect, it} from "vitest";
import {GRID_GAMES, gridGame, type GridGameCode} from "./gridGames.js";

function seeded(seed: number) {
    let state = seed;
    return (max: number) => {
        state = (state * 48271) % 2147483647;
        return state % max;
    };
}

describe("Jeux de grille : défi du jour", () => {
    for (const code of Object.keys(GRID_GAMES) as GridGameCode[]) {
        it(`${code} : la grille du jour se garde en JSON, se recharge et part sans solution`, () => {
            const game = gridGame(code);
            const stored = JSON.parse(JSON.stringify(game.generate(game.daily.size, game.daily.amount, seeded(11))));
            const loaded = game.load(stored);
            const view = JSON.parse(JSON.stringify(game.view(loaded))) as Record<string, unknown>;
            expect(view).not.toHaveProperty("solution");
            expect(game.gridSize(loaded)).toBe(game.daily.size);
            expect(game.xp(50, loaded, game.daily.amount)).toBeGreaterThan(0);
            // la grille d'une partie finie se regarde pareil (défi entre amis)
            expect(game.view(game.load(JSON.parse(JSON.stringify(game.save(loaded)))))).toEqual(game.view(loaded));
        });
    }

    it("DEMINEUR : le défi commence avec une zone déjà ouverte, sans mine", () => {
        const game = GRID_GAMES.DEMINEUR;
        const puzzle = game.load(game.generate(10, 15, seeded(4)));
        expect(puzzle.revealed.size).toBeGreaterThan(1);
        for (const cell of puzzle.revealed.keys()) expect(puzzle.mines?.has(cell)).toBe(false);
    });
});
