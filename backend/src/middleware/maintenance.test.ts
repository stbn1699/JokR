import {describe, expect, it} from "vitest";
import {isNewGameRequest} from "./maintenance.js";

describe("isNewGameRequest", () => {
    it("repère le lancement d'une partie de puzzle", () => {
        expect(isNewGameRequest("POST", "/sudoku/generateSudoku")).toBe(true);
        expect(isNewGameRequest("POST", "/queens/generate")).toBe(true);
        expect(isNewGameRequest("POST", "/daily/BINERO/start")).toBe(true);
        expect(isNewGameRequest("POST", "/daily/BINERO/replay/2026-11-10")).toBe(true);
        expect(isNewGameRequest("POST", "/challenges/abc/start")).toBe(true);
    });

    it("laisse passer la suite d'une partie et le reste du site", () => {
        expect(isNewGameRequest("POST", "/sudoku/validateSudoku")).toBe(false);
        expect(isNewGameRequest("POST", "/queens/validate")).toBe(false);
        expect(isNewGameRequest("GET", "/sudoku/games/123")).toBe(false);
        expect(isNewGameRequest("GET", "/daily/BINERO/start")).toBe(false);
        expect(isNewGameRequest("POST", "/challenges/abc/result")).toBe(false);
        expect(isNewGameRequest("POST", "/shop/buy")).toBe(false);
    });
});
