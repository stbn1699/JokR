import {questionProblem} from "./quizz.js";

/*
 * Règles d'une partie de Quizz et des duels (chacun son tour ou en direct).
 * Partagé avec le site (src/Components/Quizz/quizzMatch.ts) : le serveur recompte les points de chaque joueur
 * pour désigner le vainqueur.
 * - 7 questions ; bonne réponse : 20 points si on répond tout de suite, 2 de moins par seconde écoulée
 *   (2 au minimum) ; mauvaise réponse ou temps écoulé : 0 ; la dernière question compte double.
 * - Duel chacun son tour : le premier joueur envoie les questions jouées et ses réponses ; le second joue les mêmes
 *   questions face à ses réponses rejouées. Contre un·e ami·e (prévenu·e par une notification), ou « au hasard » :
 *   le duel attend qu'un autre joueur lance un duel au hasard sur ce thème.
 * - Duel en direct (entre amis) : chaque réponse part dès qu'elle est donnée ; chaque question attend la réponse de
 *   l'autre (au plus LIVE_GRACE_MS après la fin du chrono : au-delà, il est compté comme n'ayant pas répondu).
 */

export const ROUNDS = 7;
export const QUESTION_MS = 10_000;
export const MAX_POINTS = 20;
// présentation des deux joueurs (VS), lecture de la question avant les réponses, révélation de la bonne réponse
export const INTRO_MS = 2_200;
export const READ_MS = 2_500;
export const REVEAL_MS = 2_000;
// en direct : attente de la réponse de l'autre après la fin du chrono (réseau lent)
export const LIVE_GRACE_MS = 3_000;
// en direct : délai entre l'arrivée de l'ami·e dans le salon et la première question (les deux voient le VS)
export const LIVE_START_DELAY_MS = 3_000;
// en direct : le salon se ferme si celui qui attend ne s'y montre plus depuis ce délai
export const LOBBY_TIMEOUT_MS = 20_000;
// en direct : durée maximale d'une partie ; passé ce temps, les réponses manquantes comptent comme non données
export const LIVE_MAX_MS = LIVE_START_DELAY_MS + ROUNDS * (READ_MS + QUESTION_MS + LIVE_GRACE_MS + REVEAL_MS) + 30_000;
// Score maximal d'une partie
export const MAX_SCORE = MAX_POINTS * (ROUNDS + 1);
// Duel au hasard pris par un joueur qui ne l'a pas joué : repris par un autre au bout de ce délai
export const DUEL_CLAIM_MINUTES = 30;

// topic : thème d'où vient la question, pour une partie qui mélange plusieurs thèmes ; key : identifiant fixe de la
// question (statistiques) : q:<id en base> (quizz_questions), qu'elle vienne du site ou d'un joueur
export type DuelQuestion = { question: string; answers: string[]; correct: number; topic?: string; key?: string };

export const QUESTION_KEY = /^q:[0-9a-f-]{36}$/;
export type Answer = { index: number | null; ms: number };

export const isLastRound = (round: number) => round === ROUNDS - 1;

export function pointsFor(answer: Answer, question: DuelQuestion, round: number): number {
    if (answer.index !== question.correct || answer.ms >= QUESTION_MS) return 0;
    const points = Math.max(2, MAX_POINTS - 2 * Math.floor(answer.ms / 1000));
    return isLastRound(round) ? points * 2 : points;
}

export const scoreOf = (answers: Answer[], questions: DuelQuestion[]): number =>
    answers.reduce((total, a, round) => total + pointsFor(a, questions[round]!, round), 0);

const isIndex = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 3;

// Les 7 questions d'un duel, ou null si elles ne sont pas valables
export function parseDuelQuestions(value: unknown): DuelQuestion[] | null {
    if (!Array.isArray(value) || value.length !== ROUNDS) return null;
    const out: DuelQuestion[] = [];
    for (const item of value) {
        const q = (item ?? {}) as Record<string, unknown>;
        if (typeof q.question !== "string" || !Array.isArray(q.answers) || !q.answers.every(a => typeof a === "string")) return null;
        const question = {question: q.question, answers: q.answers as string[]};
        if (questionProblem(question) || !isIndex(q.correct)) return null;
        if (q.topic !== undefined && (typeof q.topic !== "string" || !/^[a-z0-9-]{1,60}$/.test(q.topic))) return null;
        if (q.key !== undefined && (typeof q.key !== "string" || !QUESTION_KEY.test(q.key))) return null;
        out.push({...question, correct: q.correct, ...typeof q.topic === "string" ? {topic: q.topic} : {},
            ...typeof q.key === "string" ? {key: q.key} : {}});
    }
    return new Set(out.map(q => q.question)).size === ROUNDS ? out : null;
}

// Une réponse (temps ramené à la durée de la question), ou null si elle n'est pas valable
export function parseAnswer(value: unknown): Answer | null {
    const a = (value ?? {}) as Record<string, unknown>;
    if (a.index !== null && !isIndex(a.index)) return null;
    if (typeof a.ms !== "number" || !Number.isFinite(a.ms) || a.ms < 0) return null;
    return {index: a.index, ms: Math.min(Math.round(a.ms), QUESTION_MS)};
}

// Les 7 réponses d'un joueur, ou null si elles ne sont pas valables
export function parseAnswers(value: unknown): Answer[] | null {
    if (!Array.isArray(value) || value.length !== ROUNDS) return null;
    const out = value.map(parseAnswer);
    return out.every(a => a !== null) ? out as Answer[] : null;
}

// Réponses complétées jusqu'à 7 par des « temps écoulé » (joueur parti en cours de partie en direct)
export const padAnswers = (answers: Answer[]): Answer[] =>
    [...answers, ...Array.from({length: Math.max(0, ROUNDS - answers.length)}, () => ({index: null, ms: QUESTION_MS}))].slice(0, ROUNDS);

export type DuelOutcome = "win" | "draw" | "lose";

export const outcome = (mine: number, theirs: number): DuelOutcome => mine > theirs ? "win" : mine < theirs ? "lose" : "draw";
