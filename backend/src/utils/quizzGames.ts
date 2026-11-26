import {type DuelQuestion, parseDuelQuestions, READ_MS, ROUNDS} from "./quizzDuel.js";

/*
 * Statistiques du Quizz : chaque partie (solo ou duel) est enregistrée dès sa première question, puis chaque
 * réponse dès qu'elle est donnée (tables quizz_games et quizz_answers). Une partie abandonnée garde donc ses
 * premières réponses. Le serveur recompte lui-même juste / faux et les points à partir des questions de la partie.
 */

export const GAME_MODES = ["solo", "random", "friend", "live"] as const;
export type GameMode = typeof GAME_MODES[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type GameStart = { topicId: string; mode: GameMode; duelId: string | null; questions: (DuelQuestion & { key: string })[] };

// Début d'une partie : ce qui a été choisi (thème ou mélange), le mode, le duel éventuel, et les 7 questions
// (chacune avec son identifiant fixe)
export function parseGameStart(body: unknown): GameStart | string {
    const b = (body ?? {}) as Record<string, unknown>;
    if (typeof b.topicId !== "string" || !/^[a-z0-9-]{1,60}$/.test(b.topicId)) return "Thème introuvable";
    if (!(GAME_MODES as readonly unknown[]).includes(b.mode)) return "Mode inconnu";
    const duelId = b.duelId === undefined || b.duelId === null ? null : b.duelId;
    if (duelId !== null && (typeof duelId !== "string" || !UUID.test(duelId))) return "Duel introuvable";
    // duel joué en premier : son identifiant n'existe qu'à la fin (lié à la partie par POST /quizz/duels { gameId })
    if (b.mode === "solo" && duelId !== null) return "Duel introuvable";
    const questions = parseDuelQuestions(b.questions);
    if (!questions || questions.some(q => !q.key)) return "Partie invalide";
    return {topicId: b.topicId, mode: b.mode as GameMode, duelId: duelId as string | null, questions: questions as GameStart["questions"]};
}

/*
 * Récompense de fin de partie (joueur connecté, partie enregistrée), calée sur les puzzles (une grille moyenne
 * gagnée : ~50 XP et 1 à 3 crédits pour plusieurs minutes ; une partie de Quizz dure environ une minute) :
 * - XP : un huitième du score, arrondi vers le bas (score maximal 160 : 20 XP) ;
 * - crédits : 1 à partir de 60 points, 2 à partir de 120 (QUIZZ_POINTS_PER_CREDIT).
 * Versée à la dernière réponse, sur le score recompté par le serveur, et seulement si la partie a duré au moins
 * le temps de lecture des 7 questions (une partie envoyée d'un coup par un script ne rapporte rien).
 */
export type QuizzReward = { xp: number; credits: number };

export const MIN_REWARDED_GAME_MS = ROUNDS * READ_MS;

export const QUIZZ_POINTS_PER_XP = 8;
export const QUIZZ_POINTS_PER_CREDIT = 60;

export function quizzReward(score: number): QuizzReward {
    const s = Math.max(0, Math.floor(score));
    return {xp: Math.floor(s / QUIZZ_POINTS_PER_XP), credits: Math.floor(s / QUIZZ_POINTS_PER_CREDIT)};
}
