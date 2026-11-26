import {describe, expect, it} from "vitest";
import {customMixId, isMixSlug, mixKind, mixName} from "./quizzMixes.js";
import {slugReserved} from "./quizzThemes.js";
import {parseDuelQuestions, ROUNDS} from "./quizzDuel.js";

describe("mélanges de thèmes du Quizz", () => {
    it("reconnaissent tous les thèmes, une catégorie et une partie custom", () => {
        expect(mixKind("tout")).toEqual({kind: "all"});
        expect(mixKind("categorie-cinema")).toEqual({kind: "category", category: "cinema"});
        expect(mixKind("categorie-inconnue")).toBeNull();
        expect(mixKind(customMixId(["cars", "star-wars"]))).toEqual({kind: "custom"});
        expect(mixKind("star-wars")).toBeNull();
        expect(mixName({kind: "category", category: "jeux-video"})).toBe("Jeux vidéo : tous les thèmes");
    });

    it("donnent la même adresse à la même liste de thèmes, dans n'importe quel ordre", () => {
        expect(customMixId(["cars", "star-wars", "cars"])).toBe(customMixId(["star-wars", "cars"]));
        expect(customMixId(["cars", "star-wars"])).not.toBe(customMixId(["cars", "harry-potter"]));
        expect(customMixId(["cars"])).toMatch(/^mix-[a-z0-9]{1,13}$/);
    });

    it("réservent leurs adresses (pas de thème de joueur nommé ainsi)", () => {
        for (const slug of ["tout", "mix", "mix-abc", "categorie", "custom", "categorie-cinema", "categorie-x"]) {
            expect(isMixSlug(slug)).toBe(true);
            expect(slugReserved(slug)).toBe(true);
        }
        expect(slugReserved("toutou")).toBe(false);
    });

    it("gardent le thème d'origine de chaque question d'un duel", () => {
        const questions = Array.from({length: ROUNDS}, (_, i) => ({question: `Question numéro ${i}`, answers: ["a", "b", "c", "d"], correct: 0, topic: "cars"}));
        expect(parseDuelQuestions(questions)?.[0]?.topic).toBe("cars");
        expect(parseDuelQuestions(questions.map(q => ({...q, topic: "Pas Valide"})))).toBeNull();
    });
});
