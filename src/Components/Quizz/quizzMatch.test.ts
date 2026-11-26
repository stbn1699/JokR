import {describe, expect, it} from "vitest";
import {QUIZZ_CATEGORIES, QUIZZ_TOPICS} from "./topics/index.ts";
import {botAnswer, buildMatch, MAX_SCORE, pointsFor, ROUNDS} from "./quizzMatch.ts";

const question = {question: "?", answers: ["a", "b", "c", "d"], correct: 2};

describe("thèmes du Quizz", () => {
    it("ont un identifiant unique et une catégorie connue", () => {
        const ids = QUIZZ_TOPICS.map(t => t.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const t of QUIZZ_TOPICS) expect(QUIZZ_CATEGORIES.map(c => c.id)).toContain(t.category);
    });

    it.each(QUIZZ_TOPICS.map(t => [t.name, t] as const))("%s : assez de questions, 4 réponses différentes", (_, topic) => {
        expect(topic.questions.length).toBeGreaterThanOrEqual(ROUNDS);
        for (const q of topic.questions) expect(new Set(q.answers).size).toBe(4);
        const texts = topic.questions.map(q => q.question);
        expect(new Set(texts).size).toBe(texts.length);
    });
});

describe("partie de Quizz", () => {
    it("tire 7 questions différentes et garde la bonne réponse", () => {
        const topic = QUIZZ_TOPICS[0]!;
        const match = buildMatch(topic);
        expect(match).toHaveLength(ROUNDS);
        expect(new Set(match.map(q => q.question)).size).toBe(ROUNDS);
        for (const q of match) {
            const source = topic.questions.find(s => s.question === q.question)!;
            expect(q.answers[q.correct]).toBe(source.answers[0]);
        }
    });

    it("donne plus de points aux réponses rapides", () => {
        expect(pointsFor({index: 2, ms: 400}, question, 0)).toBe(20);
        expect(pointsFor({index: 2, ms: 3200}, question, 0)).toBe(14);
        expect(pointsFor({index: 2, ms: 9900}, question, 0)).toBe(2);
    });

    it("ne donne rien à une mauvaise réponse ou trop tardive", () => {
        expect(pointsFor({index: 1, ms: 400}, question, 0)).toBe(0);
        expect(pointsFor({index: null, ms: 10_000}, question, 0)).toBe(0);
    });

    it("compte double à la dernière question", () => {
        expect(pointsFor({index: 2, ms: 400}, question, ROUNDS - 1)).toBe(40);
        expect(MAX_SCORE).toBe(160);
    });

    it("fait répondre l'adversaire dans le temps", () => {
        for (let i = 0; i < 50; i++) {
            const a = botAnswer(question);
            expect(a.ms).toBeGreaterThanOrEqual(1500);
            expect(a.ms).toBeLessThan(7500);
            expect(a.index).not.toBeNull();
        }
    });
});
