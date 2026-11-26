import {api} from "../api/api.ts";
import type {ThemeDraft, ThemeQuestion} from "../../backend/src/utils/quizzThemes.ts";
import type {Answer, DuelQuestion} from "../../backend/src/utils/quizzDuel.ts";
import type {GameMode, QuizzReward} from "../../backend/src/utils/quizzGames.ts";

export type {ThemeDraft};

/*
 * Quizz : questions proposées par les joueurs (voir backend/src/routes/Quizz.routes.ts).
 * Une question, c'est le texte et 4 réponses, la bonne en premier.
 */

// id : identifiant en base d'une question validée (lue sur le serveur)
export type ProposedQuestion = { id?: string; question: string; answers: [string, string, string, string] };

// Une question en attente, vue par l'administrateur
export interface PendingQuestion {
    id: string;
    topicId: string;
    question: string;
    answers: [string, string, string, string];
    username: string | null;
    createdAt: string;
}

// Thème validé créé par un joueur, tel que l'envoie le serveur
export interface ServerTheme {
    id: string;
    name: string;
    description: string;
    category: string;
    color: string;
    wikiUrl: string;
    wikiTitle: string | null;
    summary: string[];
    creator: string | null;
}

export type ThemeStatus = "draft" | "pending" | "approved" | "rejected";

// Un de mes thèmes (liste de la page de création)
export interface MyThemeSummary {
    id: string;
    status: ThemeStatus;
    slug: string | null;
    name: string;
    questionCount: number;
    updatedAt: string;
}

export interface MyTheme extends ThemeDraft {
    id: string;
    status: ThemeStatus;
    slug: string | null;
    updatedAt: string;
}

export interface WikiArticle {
    url: string;
    title: string;
    description: string;
    summary: string[];
}

// Thème soumis, vu par l'administrateur
export interface PendingTheme {
    id: string;
    name: string;
    description: string;
    category: string;
    color: string;
    wikiUrl: string;
    wikiTitle: string | null;
    summary: string[];
    questions: ThemeQuestion[];
    username: string | null;
    submittedAt: string | null;
}

// Un joueur d'un duel ; answers : null tant qu'elles ne sont pas visibles (voir QuizzDuelsRepository.view)
export interface DuelSide {
    username: string;
    avatar: string;
    level: number;
    score: number | null;
    answers: Answer[] | null;
}

// Un duel vu par l'un de ses joueurs
export interface QuizzDuel {
    id: string;
    topicId: string;
    topicName: string;
    random: boolean;
    live: boolean;
    role: "challenger" | "opponent";
    finished: boolean;
    createdAt: string;
    startedAt: string | null;
    lobbyOpen: boolean;
    serverNow: string;
    questions: DuelQuestion[];
    challenger: DuelSide;
    // null : adversaire au hasard pas encore trouvé
    opponent: DuelSide | null;
}

type DuelPlayer = { username: string; avatar: string } | null;

// Mes duels sur un thème
export interface MyDuels {
    record: { wins: number; draws: number; losses: number };
    toPlay: { id: string; opponent: DuelPlayer; live: boolean }[];
    waiting: { id: string; opponent: DuelPlayer; myScore: number | null }[];
    recent: { id: string; opponent: DuelPlayer; myScore: number; theirScore: number; result: "win" | "draw" | "lose" }[];
}

// Question contestée par les joueurs, vue par l'administrateur (editable : encore en base telle quelle, corrigeable
// ici ; site : question du site, sinon d'un joueur)
export interface ReportedQuestion {
    topicId: string;
    question: string;
    // la bonne réponse (celle du jeu) en premier
    answers: [string, string, string, string];
    editable: boolean;
    site: boolean;
    reports: { username: string | null; picked: string | null; reason: string; createdAt: string }[];
}

const json = {"Content-Type": "application/json"};

export const quizzService = {
    // questions validées d'un thème (site et joueurs) : les questions des parties
    approved(topicId: string, signal?: AbortSignal): Promise<ProposedQuestion[]> {
        return api<ProposedQuestion[]>(`/quizz/topics/${topicId}/questions`, {method: "GET"}, signal);
    },

    // questions validées de plusieurs thèmes, par thème (mélanges de thèmes)
    approvedMany(topicIds: string[], signal?: AbortSignal): Promise<Record<string, ProposedQuestion[]>> {
        return api(`/quizz/questions?topics=${topicIds.map(encodeURIComponent).join(",")}`, {method: "GET"}, signal);
    },

    // nombre de questions validées par thème (id du thème → nombre)
    approvedCounts(signal?: AbortSignal): Promise<Record<string, number>> {
        return api<Record<string, number>>("/quizz/counts", {method: "GET"}, signal);
    },

    // questions proposées par le joueur sur ce thème, par état
    mine(topicId: string, signal?: AbortSignal): Promise<{ pending: number; approved: number; rejected: number }> {
        return api(`/quizz/topics/${topicId}/mine`, {method: "GET"}, signal);
    },

    async submit(topicId: string, questions: ProposedQuestion[]): Promise<number> {
        const data = await api<{ count: number }>(`/quizz/topics/${topicId}/questions`,
            {method: "POST", headers: json, body: JSON.stringify({questions})});
        return data.count;
    },

    // ---------- Duels
    // answers : partie déjà jouée (chacun son tour, ami·e ou hasard) ; sans : duel en direct contre `friend`
    // gameId : la partie enregistrée pour les statistiques, liée au duel
    async createDuel(duel: { topicId: string; questions: DuelQuestion[]; answers?: Answer[]; friend?: string; gameId?: string | null }): Promise<string> {
        const data = await api<{ id: string }>("/quizz/duels", {method: "POST", headers: json, body: JSON.stringify(duel)});
        return data.id;
    },

    // duel au hasard qui attend un adversaire sur ce thème (id), ou null
    async claimRandom(topicId: string): Promise<string | null> {
        const data = await api<{ id: string } | null>(`/quizz/topics/${topicId}/duels/random`, {method: "POST"});
        return data?.id ?? null;
    },

    myDuels(topicId: string, signal?: AbortSignal): Promise<MyDuels> {
        return api<MyDuels>(`/quizz/topics/${topicId}/duels`, {method: "GET"}, signal);
    },

    duel(id: string, signal?: AbortSignal): Promise<QuizzDuel> {
        return api<QuizzDuel>(`/quizz/duels/${id}`, {method: "GET"}, signal);
    },

    async joinDuel(id: string): Promise<void> {
        await api(`/quizz/duels/${id}/join`, {method: "POST"});
    },

    async answerDuel(id: string, round: number, answer: Answer): Promise<void> {
        await api(`/quizz/duels/${id}/answer`, {method: "POST", headers: json, body: JSON.stringify({round, ...answer})});
    },

    async submitDuel(id: string, answers: Answer[]): Promise<void> {
        await api(`/quizz/duels/${id}/answers`, {method: "POST", headers: json, body: JSON.stringify({answers})});
    },

    async duelToTurns(id: string): Promise<void> {
        await api(`/quizz/duels/${id}/turns`, {method: "POST"});
    },

    async cancelDuel(id: string): Promise<void> {
        await api(`/quizz/duels/${id}`, {method: "DELETE"});
    },

    // ---------- Statistiques : chaque partie et chaque réponse (backend/src/utils/quizzGames.ts)
    async startGame(game: { topicId: string; mode: GameMode; duelId?: string; questions: DuelQuestion[] }): Promise<string> {
        const data = await api<{ id: string }>("/quizz/games", {method: "POST", headers: json, body: JSON.stringify(game)});
        return data.id;
    },

    // à la dernière réponse : la récompense versée (XP et crédits, voir quizzReward), ou null
    answerGame(gameId: string, round: number, answer: Answer): Promise<{ reward: QuizzReward | null }> {
        return api(`/quizz/games/${gameId}/answer`, {method: "POST", headers: json, body: JSON.stringify({round, ...answer})});
    },

    // record solo du joueur sur un thème ou un mélange (parties enregistrées sur le serveur)
    soloRecord(topicId: string, signal?: AbortSignal): Promise<{ best: number; games: number }> {
        return api(`/quizz/topics/${topicId}/solo`, {method: "GET"}, signal);
    },

    // ---------- Questions contestées en fin de partie
    async report(report: { topicId: string; question: string; answers: string[]; picked: string | null; reason: string }): Promise<void> {
        await api("/quizz/reports", {method: "POST", headers: json, body: JSON.stringify(report)});
    },

    reports(signal?: AbortSignal): Promise<ReportedQuestion[]> {
        return api<ReportedQuestion[]>("/quizz/reports", {method: "GET"}, signal);
    },

    async reviewReport(review: { topicId: string; question: string; status: "fixed" | "dismissed"; edit?: ProposedQuestion }): Promise<void> {
        await api("/quizz/reports/review", {method: "PUT", headers: json, body: JSON.stringify(review)});
    },

    // ---------- Thèmes créés par les joueurs
    themes(signal?: AbortSignal): Promise<ServerTheme[]> {
        return api<ServerTheme[]>("/quizz/themes", {method: "GET"}, signal);
    },

    wiki(url: string, signal?: AbortSignal): Promise<WikiArticle> {
        return api<WikiArticle>(`/quizz/wiki?url=${encodeURIComponent(url)}`, {method: "GET"}, signal);
    },

    myThemes(signal?: AbortSignal): Promise<MyThemeSummary[]> {
        return api<MyThemeSummary[]>("/quizz/my-themes", {method: "GET"}, signal);
    },

    myTheme(id: string, signal?: AbortSignal): Promise<MyTheme> {
        return api<MyTheme>(`/quizz/my-themes/${id}`, {method: "GET"}, signal);
    },

    createTheme(draft: ThemeDraft): Promise<{ id: string; updatedAt: string }> {
        return api(`/quizz/my-themes`, {method: "POST", headers: json, body: JSON.stringify(draft)});
    },

    saveTheme(id: string, draft: ThemeDraft): Promise<{ updatedAt: string }> {
        return api(`/quizz/my-themes/${id}`, {method: "PUT", headers: json, body: JSON.stringify(draft)});
    },

    async deleteTheme(id: string): Promise<void> {
        await api(`/quizz/my-themes/${id}`, {method: "DELETE"});
    },

    async submitTheme(id: string, draft: ThemeDraft): Promise<void> {
        await api(`/quizz/my-themes/${id}/submit`, {method: "POST", headers: json, body: JSON.stringify(draft)});
    },

    pendingThemes(signal?: AbortSignal): Promise<PendingTheme[]> {
        return api<PendingTheme[]>("/quizz/themes/pending", {method: "GET"}, signal);
    },

    async reviewTheme(id: string, status: "approved" | "rejected"): Promise<void> {
        await api(`/quizz/themes/${id}/review`, {method: "PUT", headers: json, body: JSON.stringify({status})});
    },

    pending(signal?: AbortSignal): Promise<PendingQuestion[]> {
        return api<PendingQuestion[]>("/quizz/pending", {method: "GET"}, signal);
    },

    // valider (avec la question corrigée si besoin) ou refuser
    async review(id: string, status: "approved" | "rejected", edit?: ProposedQuestion): Promise<void> {
        await api(`/quizz/questions/${id}`, {method: "PUT", headers: json, body: JSON.stringify({status, ...edit})});
    },
};
