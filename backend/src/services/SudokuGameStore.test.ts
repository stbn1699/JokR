import {afterEach, describe, expect, it, vi} from "vitest";
import {SudokuGameStore} from "./SudokuGameStore.js";

const puzzle = Array.from({length: 9}, (_, r) => Array.from({length: 9}, (_, c) => (r === c ? r + 1 : 0)));

describe("SudokuGameStore", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("mémorise une grille et compte ses indices", () => {
        const store = new SudokuGameStore();
        const id = store.create(puzzle);
        const game = store.get(id);
        expect(game?.puzzle).toBe(puzzle);
        expect(game?.cluesCount).toBe(9);
    });

    it("donne un identifiant différent à chaque partie", () => {
        const store = new SudokuGameStore();
        expect(store.create(puzzle)).not.toBe(store.create(puzzle));
    });

    it("oublie une partie supprimée (pas de double validation)", () => {
        const store = new SudokuGameStore();
        const id = store.create(puzzle);
        store.delete(id);
        expect(store.get(id)).toBeUndefined();
    });

    it("renvoie undefined pour un identifiant inconnu", () => {
        expect(new SudokuGameStore().get("inconnu")).toBeUndefined();
    });

    it("expire une partie après 6 heures", () => {
        vi.useFakeTimers();
        const store = new SudokuGameStore();
        const id = store.create(puzzle);

        vi.advanceTimersByTime(6 * 60 * 60 * 1000 - 1);
        expect(store.get(id)).toBeDefined();

        vi.advanceTimersByTime(2);
        expect(store.get(id)).toBeUndefined();
    });
});
