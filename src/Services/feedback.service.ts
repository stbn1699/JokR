import {api} from "../api/api.ts";

export type FeedbackKind = "bug" | "idea";

export const FEEDBACK_MIN = 5;
export const FEEDBACK_MAX = 2000;

// Un retour, vu par l'administrateur
export interface FeedbackEntry {
    id: string;
    kind: FeedbackKind;
    message: string;
    page: string | null;
    userAgent: string | null;
    username: string;
    createdAt: string;
    doneAt: string | null;
}

const json = {"Content-Type": "application/json"};

export const feedbackService = {
    async send(kind: FeedbackKind, message: string, page: string | null): Promise<void> {
        await api("/feedback", {method: "POST", headers: json, body: JSON.stringify({kind, message, page})});
    },

    list(signal?: AbortSignal): Promise<FeedbackEntry[]> {
        return api<FeedbackEntry[]>("/feedback", {method: "GET"}, signal);
    },

    async setDone(id: string, done: boolean): Promise<void> {
        await api(`/feedback/${id}/done`, {method: "PUT", headers: json, body: JSON.stringify({done})});
    },
};
