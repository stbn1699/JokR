import {describe, expect, it} from "vitest";
import {outcome, padAnswers, parseAnswer, parseAnswers, parseDuelQuestions, QUESTION_MS, ROUNDS, scoreOf} from "./quizzDuel.js";

const questions = Array.from({length: ROUNDS}, (_, i) => ({question: `Question numéro ${i}`, answers: ["a", "b", "c", "d"], correct: i % 4}));

describe("duels du Quizz", () => {
    it("acceptent 7 questions différentes avec une bonne réponse", () => {
        expect(parseDuelQuestions(questions)).toEqual(questions);
        expect(parseDuelQuestions(questions.slice(1))).toBeNull();
        expect(parseDuelQuestions(questions.map(q => ({...q, question: "Même question"})))).toBeNull();
        expect(parseDuelQuestions(questions.map((q, i) => (i === 0 ? {...q, correct: 4} : q)))).toBeNull();
        expect(parseDuelQuestions(questions.map((q, i) => (i === 0 ? {...q, answers: ["a", "a", "c", "d"]} : q)))).toBeNull();
    });

    it("vérifient chaque réponse et bornent le temps", () => {
        expect(parseAnswer({index: 2, ms: 1234.6})).toEqual({index: 2, ms: 1235});
        expect(parseAnswer({index: null, ms: 99_999})).toEqual({index: null, ms: QUESTION_MS});
        expect(parseAnswer({index: 5, ms: 10})).toBeNull();
        expect(parseAnswer({index: 1, ms: -1})).toBeNull();
        expect(parseAnswers(Array(ROUNDS).fill({index: 0, ms: 500}))).toHaveLength(ROUNDS);
        expect(parseAnswers(Array(ROUNDS - 1).fill({index: 0, ms: 500}))).toBeNull();
    });

    it("recomptent les points (dernière question double) et complètent une partie abandonnée", () => {
        const answers = questions.map(q => ({index: q.correct, ms: 0}));
        expect(scoreOf(answers, questions)).toBe(160);
        const padded = padAnswers(answers.slice(0, 2));
        expect(padded).toHaveLength(ROUNDS);
        expect(scoreOf(padded, questions)).toBe(40);
    });

    it("désignent le vainqueur", () => {
        expect(outcome(10, 5)).toBe("win");
        expect(outcome(5, 10)).toBe("lose");
        expect(outcome(5, 5)).toBe("draw");
    });
});

describe("identifiant fixe des questions", () => {
    it("accepte l'identifiant en base d'une question, refuse le reste", () => {
        const withKey = (key: string) => parseDuelQuestions(questions.map(q => ({...q, key})));
        expect(withKey("q:0d4c2a8e-1b7f-4a39-9c51-2f6e8d0b7a13")?.[0]?.key).toBe("q:0d4c2a8e-1b7f-4a39-9c51-2f6e8d0b7a13");
        expect(withKey("site:star-wars:12")).toBeNull();
        expect(withKey("autre:chose")).toBeNull();
    });
});
