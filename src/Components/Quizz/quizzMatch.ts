import type {QuizzTopic} from "./topics/index.ts";

/**
 * Règles d'une partie de Quizz (inspirées de QuizUp) :
 * - 7 questions tirées au hasard dans le thème ; chacune s'affiche seule pendant READ_MS (le temps de la lire),
 *   puis les réponses apparaissent et le chrono de 10 secondes démarre ;
 * - bonne réponse : 20 points si on répond tout de suite, 2 de moins par seconde écoulée (2 au minimum) ;
 *   mauvaise réponse ou temps écoulé : 0 ;
 * - la dernière question compte double.
 * Deux modes : solo (seul contre le chrono) et duel (contre un adversaire). En attendant les parties contre de
 * vrais joueurs, l'adversaire du duel est simulé (botAnswer).
 */

export type QuizzMode = "solo" | "duel";

export const isQuizzMode = (mode: string | undefined): mode is QuizzMode => mode === "solo" || mode === "duel";

export const ROUNDS = 7;
export const QUESTION_MS = 10_000;
// temps de lecture de la question, avant l'arrivée des réponses
export const READ_MS = 2_500;
export const MAX_POINTS = 20;

export type MatchQuestion = {
    question: string;
    answers: string[];
    correct: number;
    image?: string;
};

export type Answer = { index: number | null; ms: number };

export type Rng = () => number;

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
}

// Questions de la partie, réponses mélangées (la bonne est en premier dans les données)
export function buildMatch(topic: QuizzTopic, rng: Rng = Math.random): MatchQuestion[] {
    return shuffle(topic.questions, rng).slice(0, ROUNDS).map(q => {
        const order = shuffle([0, 1, 2, 3], rng);
        return {question: q.question, image: q.image, answers: order.map(i => q.answers[i]!), correct: order.indexOf(0)};
    });
}

export const isLastRound = (round: number) => round === ROUNDS - 1;

export function pointsFor(answer: Answer, question: MatchQuestion, round: number): number {
    if (answer.index !== question.correct || answer.ms >= QUESTION_MS) return 0;
    const points = Math.max(2, MAX_POINTS - 2 * Math.floor(answer.ms / 1000));
    return isLastRound(round) ? points * 2 : points;
}

// Score maximal d'une partie (barre de score)
export const MAX_SCORE = MAX_POINTS * (ROUNDS + 1);

// Adversaire simulé : bonne réponse 7 fois sur 10, répond entre 1,5 et 7,5 secondes
export function botAnswer(question: MatchQuestion, rng: Rng = Math.random): Answer {
    const ms = 1500 + Math.floor(rng() * 6000);
    if (rng() < 0.7) return {index: question.correct, ms};
    const wrong = [0, 1, 2, 3].filter(i => i !== question.correct);
    return {index: wrong[Math.floor(rng() * wrong.length)]!, ms};
}

// Noms des adversaires simulés
const BOT_NAMES = ["Zéphyr", "Pixel", "Nova", "Gribouille", "Comète", "Biscotte", "Orion", "Mistral", "Praline", "Kiwi"];

export const botName = (rng: Rng = Math.random) => BOT_NAMES[Math.floor(rng() * BOT_NAMES.length)]!;
