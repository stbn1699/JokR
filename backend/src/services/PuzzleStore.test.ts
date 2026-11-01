import {afterEach, describe, expect, it, vi} from "vitest";
import {PuzzleStore} from "./PuzzleStore.js";

const puzzle = Array.from({length: 9}, (_, r) => Array.from({length: 9}, (_, c) => (r === c ? r + 1 : 0)));

describe("PuzzleStore", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("mémorise une grille et son nombre d'indices", () => {
        const store = new PuzzleStore<number[][]>();
        const id = store.create(puzzle, 9);
        const game = store.get(id);
        expect(game?.puzzle).toBe(puzzle);
        expect(game?.cluesCount).toBe(9);
    });

    it("donne un identifiant différent à chaque partie", () => {
        const store = new PuzzleStore<number[][]>();
        expect(store.create(puzzle, 9)).not.toBe(store.create(puzzle, 9));
    });

    it("oublie une partie supprimée (pas de double validation)", () => {
        const store = new PuzzleStore<number[][]>();
        const id = store.create(puzzle, 9);
        store.delete(id);
        expect(store.get(id)).toBeUndefined();
    });

    it("renvoie undefined pour un identifiant inconnu", () => {
        expect(new PuzzleStore<number[][]>().get("inconnu")).toBeUndefined();
    });

    it("expire une partie après 6 heures", () => {
        vi.useFakeTimers();
        const store = new PuzzleStore<number[][]>();
        const id = store.create(puzzle, 9);

        vi.advanceTimersByTime(6 * 60 * 60 * 1000 - 1);
        expect(store.get(id)).toBeDefined();

        vi.advanceTimersByTime(2);
        expect(store.get(id)).toBeUndefined();
    });
});
