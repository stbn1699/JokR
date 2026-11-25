import {describe, expect, it} from "vitest";
import {DUEL_GAMES, duelDifficulties, duelPuzzle} from "./duels.js";
import {startPuzzle} from "./puzzleGames.js";

describe("duels", () => {
    it("propose les quatre difficultés aux jeux qui ont des niveaux, Standard aux autres", () => {
        expect(duelDifficulties("SUDOKU")).toEqual(["Facile", "Moyen", "Difficile", "Expert"]);
        expect(duelDifficulties("COLORIA")).toEqual(["Standard"]);
    });

    it("refuse un jeu ou une difficulté inconnus", () => {
        expect(duelPuzzle("POKER", "Facile")).toBeNull();
        expect(duelPuzzle("SUDOKU", "Standard")).toBeNull();
        expect(duelPuzzle("COLORIA", "Expert")).toBeNull();
    });

    it("pioche plus loin dans les niveaux quand la difficulté monte", () => {
        const first = (difficulty: string) => duelPuzzle("SUDOKU", difficulty, () => 0)!.puzzle;
        const clues = (p: unknown) => (p as number[][]).flat().filter(v => v !== 0).length;
        expect(clues(first("Facile"))).toBeGreaterThanOrEqual(clues(first("Expert")));
    });

    it.each(DUEL_GAMES)("%s : la grille du duel se lance comme une partie", code => {
        for (const difficulty of duelDifficulties(code)) {
            const duel = duelPuzzle(code, difficulty)!;
            expect(duel).not.toBeNull();
            // la grille est gardée en base en JSON : elle doit survivre à l'aller-retour
            const stored = JSON.parse(JSON.stringify(duel.puzzle));
            const {gameId, grid} = startPuzzle(duel.code, stored, {aid: duel.emptyCells});
            expect(gameId).toBeTruthy();
            expect(grid).toBeTruthy();
            expect(duel.gridSize).toBeGreaterThan(0);
        }
    }, 30_000);
});
