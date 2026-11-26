import {api} from "../api/api.ts";

/*
 * Quizz : questions proposées par les joueurs (voir backend/src/routes/Quizz.routes.ts).
 * Une question, c'est le texte et 4 réponses, la bonne en premier.
 */

export type ProposedQuestion = { question: string; answers: [string, string, string, string] };

// Une question en attente, vue par l'administrateur
export interface PendingQuestion {
    id: string;
    topicId: string;
    question: string;
    answers: [string, string, string, string];
    username: string | null;
    createdAt: string;
}

const json = {"Content-Type": "application/json"};

export const quizzService = {
    // questions validées d'un thème, ajoutées à celles du site dans les parties
    approved(topicId: string, signal?: AbortSignal): Promise<ProposedQuestion[]> {
        return api<ProposedQuestion[]>(`/quizz/topics/${topicId}/questions`, {method: "GET"}, signal);
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

    pending(signal?: AbortSignal): Promise<PendingQuestion[]> {
        return api<PendingQuestion[]>("/quizz/pending", {method: "GET"}, signal);
    },

    // valider (avec la question corrigée si besoin) ou refuser
    async review(id: string, status: "approved" | "rejected", edit?: ProposedQuestion): Promise<void> {
        await api(`/quizz/questions/${id}`, {method: "PUT", headers: json, body: JSON.stringify({status, ...edit})});
    },
};
