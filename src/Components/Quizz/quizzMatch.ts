import type {PlayableTopic, QuizzQuestion} from "./topics/index.ts";
import {
    type Answer, type DuelQuestion, INTRO_MS, isLastRound, LIVE_GRACE_MS, MAX_POINTS, MAX_SCORE, pointsFor, QUESTION_MS,
    READ_MS, REVEAL_MS, ROUNDS, scoreOf,
} from "../../../backend/src/utils/quizzDuel.ts";

/**
 * Règles d'une partie de Quizz (inspirées de QuizUp), partagées avec le serveur (backend/src/utils/quizzDuel.ts) :
 * - 7 questions tirées au hasard dans le thème ; chacune s'affiche seule pendant READ_MS (le temps de la lire),
 *   puis les réponses apparaissent et le chrono de 10 secondes démarre ;
 * - bonne réponse : 20 points si on répond tout de suite, 2 de moins par seconde écoulée (2 au minimum) ;
 *   mauvaise réponse ou temps écoulé : 0 ;
 * - la dernière question compte double.
 * Deux modes : solo (seul contre le chrono) et duel : contre un adversaire au hasard ou un·e ami·e, en direct ou
 * chacun son tour (le second joue face aux réponses du premier, rejouées).
 */

export {type Answer, INTRO_MS, isLastRound, LIVE_GRACE_MS, MAX_POINTS, MAX_SCORE, pointsFor, QUESTION_MS, READ_MS, REVEAL_MS, ROUNDS, scoreOf};

export type QuizzMode = "solo" | "duel";

export const isQuizzMode = (mode: string | undefined): mode is QuizzMode => mode === "solo" || mode === "duel";

export type MatchQuestion = DuelQuestion;

export type Rng = () => number;

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
}

// Question lue sur le serveur (quizz_questions) : son identifiant en base devient « q:<id> », l'identifiant fixe de la
// question dans les statistiques, qu'elle vienne du site ou d'un joueur
export const fromServer = (q: { id?: string; question: string; answers: QuizzQuestion["answers"] }): QuizzQuestion =>
    ({...q, ...q.id ? {id: `q:${q.id}`} : {}});

// Questions de la partie, réponses mélangées (la bonne est en premier dans les données)
export function buildMatch(topic: PlayableTopic, rng: Rng = Math.random): MatchQuestion[] {
    return shuffle(topic.questions, rng).slice(0, ROUNDS).map(q => {
        const order = shuffle([0, 1, 2, 3], rng);
        const key = q.id;
        return {question: q.question, answers: order.map(i => q.answers[i]!), correct: order.indexOf(0),
            ...q.topic ? {topic: q.topic} : {}, ...key ? {key} : {}};
    });
}

/*
 * Questions d'un duel reçu, vérifiées contre celles du thème lues sur le serveur : seules des questions existantes
 * (même texte, mêmes réponses, même bonne réponse) s'affichent. false si l'une d'elles n'existe pas (ou plus).
 */
export function knownQuestions(match: MatchQuestion[], questions: QuizzQuestion[]): boolean {
    return match.length === ROUNDS && match.every(m => questions.some(q => q.question === m.question
        && q.answers[0] === m.answers[m.correct]
        && [...q.answers].sort().join("\n") === [...m.answers].sort().join("\n")));
}
