import {describe, expect, it} from "vitest";
import {type PlayableTopic, QUIZZ_CATEGORIES, QUIZZ_TOPICS} from "./topics/index.ts";
import {QUIZZ_TOPIC_CATEGORIES, QUIZZ_TOPIC_NAMES} from "../../../backend/src/utils/quizz.ts";
import {QUESTION_KEY} from "../../../backend/src/utils/quizzDuel.ts";
import {THEME_CATEGORIES} from "../../../backend/src/utils/quizzThemes.ts";
import {CATEGORY_LABELS} from "../../../backend/src/utils/quizzMixes.ts";
import {buildMixTopic, mixKind, quizzPath} from "./quizzMixes.ts";
import {buildMatch, fromServer, knownQuestions, MAX_SCORE, pointsFor, ROUNDS} from "./quizzMatch.ts";

const question = {question: "?", answers: ["a", "b", "c", "d"], correct: 2};

// Un thème du site et ses questions telles que le serveur les envoie (identifiant en base)
const uuid = (n: number) => `0d4c2a8e-1b7f-4a39-9c51-${String(n).padStart(12, "0")}`;
const playable = (index: number, count = 12): PlayableTopic => ({
    ...QUIZZ_TOPICS[index]!,
    questions: Array.from({length: count}, (_, i) =>
        fromServer({id: uuid(index * 100 + i), question: `Question ${index}-${i} ?`, answers: [`bonne ${i}`, "b", "c", "d"]})),
});

describe("thèmes du Quizz", () => {
    it("ont un identifiant unique et une catégorie connue", () => {
        const ids = QUIZZ_TOPICS.map(t => t.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const t of QUIZZ_TOPICS) expect(QUIZZ_CATEGORIES.map(c => c.id)).toContain(t.category);
    });

    it("sont tous connus du serveur (questions proposées par les joueurs)", () => {
        expect(QUIZZ_TOPIC_NAMES).toEqual(Object.fromEntries(QUIZZ_TOPICS.map(t => [t.id, t.name])));
    });

    it("ont la même catégorie sur le serveur (statistiques par catégorie)", () => {
        expect(QUIZZ_TOPIC_CATEGORIES).toEqual(Object.fromEntries(QUIZZ_TOPICS.map(t => [t.id, t.category])));
    });

    it("ont les mêmes catégories que le serveur (thèmes créés par les joueurs)", () => {
        expect(QUIZZ_CATEGORIES.map(c => c.id)).toEqual([...THEME_CATEGORIES]);
    });

    it("ont les mêmes noms de catégories que le serveur (mélanges)", () => {
        expect(Object.fromEntries(QUIZZ_CATEGORIES.map(c => [c.id, c.label]))).toEqual(CATEGORY_LABELS);
    });
});

describe("partie de Quizz", () => {
    it("tire 7 questions différentes et garde la bonne réponse", () => {
        const topic = playable(0);
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

    it("n'affiche un duel reçu que si ses questions existent dans le thème", () => {
        const topic = playable(0);
        const match = buildMatch(topic);
        expect(knownQuestions(match, topic.questions)).toBe(true);
        const forged = match.map((q, i) => (i === 3 ? {...q, question: "Question inventée ?"} : q));
        expect(knownQuestions(forged, topic.questions)).toBe(false);
        const wrongAnswer = match.map((q, i) => (i === 0 ? {...q, correct: (q.correct + 1) % 4} : q));
        expect(knownQuestions(wrongAnswer, topic.questions)).toBe(false);
    });
});

describe("mélanges de thèmes", () => {
    it("réunissent les questions de leurs thèmes, chacune avec son thème d'origine", () => {
        const [a, b] = [playable(0), playable(1)];
        const mix = buildMixTopic("mix-test", {kind: "custom"}, [a, b], {[a.id]: a.questions, [b.id]: b.questions});
        expect(mix.questions).toHaveLength(a.questions.length + b.questions.length);
        expect(mix.questions.find(q => q.question === b.questions[0]!.question)?.topic).toBe(b.id);
        const match = buildMatch(mix);
        expect(match.every(q => q.topic === a.id || q.topic === b.id)).toBe(true);
        expect(quizzPath(mix, "duel", {ami: "Léa"})).toBe(`/quizz/mix-test/duel?themes=${a.id},${b.id}&ami=L%C3%A9a`);
    });

    it("reconnaissent tous les thèmes et les catégories", () => {
        const all = buildMixTopic("tout", mixKind("tout")!, QUIZZ_TOPICS, {[QUIZZ_TOPICS[2]!.id]: playable(2).questions});
        expect(all.questions).toHaveLength(12);
        expect(all.mix?.topics).toHaveLength(QUIZZ_TOPICS.length);
        expect(quizzPath(all)).toBe("/quizz/tout");
        const cinema = mixKind("categorie-cinema")!;
        expect(cinema).toEqual({kind: "category", category: "cinema"});
    });
});

describe("identifiant fixe des questions (statistiques)", () => {
    it("q:<id en base> pour toutes les questions, gardé dans la partie", () => {
        const topic = playable(0);
        expect(topic.questions[0]!.id).toBe(`q:${uuid(0)}`);
        for (const q of buildMatch(topic)) expect(q.key).toMatch(QUESTION_KEY);
    });
});
