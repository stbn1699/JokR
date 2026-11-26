import {describe, expect, it} from "vitest";
import {BATCH_MAX, parseQuestion, parseQuestions, parseReport, parseReportReview, parseReview, REPORT_REASON_MAX} from "./quizz.js";

const ok = {question: "Qui est le père de Luke ?", answers: ["Dark Vador", "Yoda", "Obi-Wan", "Han Solo"]};

describe("questions du Quizz proposées par les joueurs", () => {
    it("accepte une question complète et nettoie les espaces", () => {
        expect(parseQuestion({question: "  Qui est   le père de Luke ? ", answers: [" Dark Vador", "Yoda", "Obi-Wan", "Han Solo "]}))
            .toEqual(ok);
    });

    it("refuse une question trop courte ou des réponses manquantes", () => {
        expect(parseQuestion({...ok, question: "Qui"})).toBe("La question est trop courte");
        expect(parseQuestion({...ok, answers: ["a", "b", ""]})).toBe("Il faut remplir les 4 réponses");
        expect(parseQuestion({...ok, answers: "pas une liste"})).toBe("Il faut remplir les 4 réponses");
    });

    it("refuse deux réponses identiques, même en changeant les majuscules", () => {
        expect(parseQuestion({...ok, answers: ["Yoda", "yoda", "Luke", "Leia"]})).toBe("Les 4 réponses doivent être différentes");
    });

    it("dit quelle question pose problème dans un envoi groupé", () => {
        expect(parseQuestions({questions: [ok, ok]})).toHaveLength(2);
        expect(parseQuestions({questions: [ok, {...ok, question: "?"}]})).toBe("Question 2 : la question est trop courte");
        expect(parseQuestions({questions: []})).toBe("Ajoute au moins une question");
        expect(parseQuestions({questions: Array(BATCH_MAX + 1).fill(ok)})).toBe(`${BATCH_MAX} questions au plus par envoi`);
    });

    it("lit la décision de l'administrateur, avec ou sans correction", () => {
        expect(parseReview({status: "rejected"})).toEqual({status: "rejected", edit: null});
        expect(parseReview({status: "approved", ...ok})).toEqual({status: "approved", edit: ok});
        expect(parseReview({status: "peut-être"})).toBe("Choisis « Valider » ou « Refuser »");
    });
});

describe("questions contestées", () => {
    const played = {topicId: "cars", question: "  Quelle   couleur ? ", answers: ["Rouge", "Bleu", "Vert", "Jaune"]};

    it("gardent la question jouée, la réponse choisie et l'explication", () => {
        expect(parseReport({...played, picked: "Bleu", reason: " C'est bleu "})).toEqual({
            topicId: "cars", question: "Quelle couleur ?", answers: ["Rouge", "Bleu", "Vert", "Jaune"], picked: "Bleu", reason: "C'est bleu",
        });
        expect(parseReport({...played, picked: null})).toMatchObject({picked: null, reason: ""});
    });

    it("refusent une réponse inconnue, un thème invalide ou une explication trop longue", () => {
        expect(parseReport({...played, picked: "Violet"})).toBe("Réponse introuvable");
        expect(parseReport({...played, topicId: "Pas un thème"})).toBe("Thème introuvable");
        expect(typeof parseReport({...played, reason: "x".repeat(REPORT_REASON_MAX + 1)})).toBe("string");
    });

    it("se décident : corrigée (avec ou sans correction) ou réponse juste", () => {
        expect(parseReportReview({topicId: "cars", question: "Q ?", status: "dismissed"})).toMatchObject({status: "dismissed", edit: null});
        expect(parseReportReview({topicId: "cars", question: "Q ?", status: "fixed", edit: {question: "Quelle couleur ?", answers: ["a", "b", "c", "d"]}}))
            .toMatchObject({status: "fixed", edit: {question: "Quelle couleur ?"}});
        expect(typeof parseReportReview({topicId: "cars", question: "Q ?", status: "maybe"})).toBe("string");
    });
});
