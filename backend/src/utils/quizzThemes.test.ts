import {describe, expect, it} from "vitest";
import {
    THEME_MIN_QUESTIONS, parseDraft, parseWikiUrl, slugReserved, summaryParagraphs, themeProblems, themeSlug, type ThemeDraft,
} from "./quizzThemes.js";

const question = (i: number) => ({question: `Question numéro ${i} ?`, answers: ["Bonne", "Faux 1", "Faux 2", "Faux 3"] as [string, string, string, string]});

const complete: ThemeDraft = {
    name: "Le Seigneur des Anneaux", description: "La Terre du Milieu", category: "livres", color: "#16a34a",
    wikiUrl: "https://fr.wikipedia.org/wiki/Le_Seigneur_des_anneaux",
    questions: Array.from({length: THEME_MIN_QUESTIONS}, (_, i) => question(i)),
};

describe("thèmes du Quizz créés par les joueurs", () => {
    it("lit l'adresse d'un article de Wikipédia, et seulement ça", () => {
        expect(parseWikiUrl("https://fr.wikipedia.org/wiki/Le_Seigneur_des_anneaux")).toEqual({lang: "fr", title: "Le Seigneur des anneaux"});
        expect(parseWikiUrl("https://en.m.wikipedia.org/wiki/Star_Wars")).toEqual({lang: "en", title: "Star Wars"});
        expect(parseWikiUrl("https://fr.wikipedia.org/wiki/%C3%89mile_Zola")?.title).toBe("Émile Zola");
        expect(parseWikiUrl("http://fr.wikipedia.org/wiki/Zola")).toBeNull();
        expect(parseWikiUrl("https://evil.example/wiki/Zola")).toBeNull();
        expect(parseWikiUrl("https://fr.wikipedia.org.evil.example/wiki/Zola")).toBeNull();
        expect(parseWikiUrl("https://fr.wikipedia.org/wiki/Spécial:Recherche")).toBeNull();
        expect(parseWikiUrl("pas une adresse")).toBeNull();
    });

    it("garde un brouillon à moitié fait sans rien refuser", () => {
        const draft = parseDraft({name: "  Zelda", category: "inconnue", color: "rouge", questions: [{question: "Qui ?", answers: ["Link"]}]});
        expect(draft).toEqual({name: "Zelda", description: "", category: "", color: "", wikiUrl: "",
            questions: [{question: "Qui ?", answers: ["Link", "", "", ""]}]});
        expect(parseDraft(null).questions).toEqual([]);
    });

    it("accepte un thème complet", () => {
        expect(themeProblems(complete, true)).toEqual([]);
    });

    it("dit ce qui manque", () => {
        const problems = themeProblems({...complete, name: "", color: "", questions: complete.questions.slice(0, 28)}, false);
        expect(problems).toEqual(["Donne un nom au thème", "Choisis une couleur", "Ajoute le lien d'un article Wikipédia sur le thème",
            "Encore 2 questions (30 au minimum)"]);
    });

    it("ignore les cartes vides mais compte les questions mal remplies", () => {
        const questions = [...complete.questions, {question: "", answers: ["", "", "", ""] as [string, string, string, string]},
            {question: "Qui ?", answers: ["", "", "", ""] as [string, string, string, string]}];
        expect(themeProblems({...complete, questions}, true)).toEqual(["Une question est à corriger"]);
    });

    it("refuse deux questions identiques", () => {
        expect(themeProblems({...complete, questions: [...complete.questions, question(1)]}, true)).toEqual(["Deux questions sont identiques"]);
    });

    it("tire l'adresse du nom et protège les adresses prises", () => {
        expect(themeSlug("Le Seigneur des Anneaux !")).toBe("le-seigneur-des-anneaux");
        expect(themeSlug("Pokémon : Épée")).toBe("pokemon-epee");
        expect(slugReserved("star-wars")).toBe(true);
        expect(slugReserved("creer")).toBe(true);
        expect(slugReserved("")).toBe(true);
        expect(slugReserved("zelda")).toBe(true);
        expect(slugReserved("jardinage-zen")).toBe(false);
    });

    it("garde les premiers paragraphes de l'introduction", () => {
        const long = "x".repeat(100);
        expect(summaryParagraphs(`${long}\ncourt\n${long}\n${long}\n${long}`)).toEqual([long, long, long]);
    });
});
