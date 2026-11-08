import {describe, expect, it} from "vitest";
import {FEEDBACK_MAX, parseFeedback} from "./feedback.js";

describe("parseFeedback", () => {
    it("accepte un bug ou une idée, message nettoyé", () => {
        expect(parseFeedback({kind: "bug", message: "  La grille ne charge pas  ", page: "/playgame/SUDOKU"}, "Firefox"))
            .toEqual({kind: "bug", message: "La grille ne charge pas", page: "/playgame/SUDOKU", userAgent: "Firefox"});
        expect(parseFeedback({kind: "idea", message: "Un mode sombre"}, undefined))
            .toEqual({kind: "idea", message: "Un mode sombre", page: null, userAgent: null});
    });

    it("refuse une sorte inconnue, un message trop court ou trop long", () => {
        expect(parseFeedback({kind: "spam", message: "bonjour"}, null)).toBeTypeOf("string");
        expect(parseFeedback({kind: "bug", message: "  ok "}, null)).toBeTypeOf("string");
        expect(parseFeedback({kind: "bug", message: "a".repeat(FEEDBACK_MAX + 1)}, null)).toBeTypeOf("string");
        expect(parseFeedback(null, null)).toBeTypeOf("string");
    });
});
