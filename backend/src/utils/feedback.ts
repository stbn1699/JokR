/*
 * Retours des joueurs : vérification de ce qu'envoie le formulaire.
 */
export const FEEDBACK_KINDS = ["bug", "idea"] as const;
export type FeedbackKind = typeof FEEDBACK_KINDS[number];

export const FEEDBACK_MIN = 5;
export const FEEDBACK_MAX = 2000;

export type FeedbackInput = { kind: FeedbackKind; message: string; page: string | null; userAgent: string | null };

const cut = (value: unknown, max: number): string | null =>
    typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

// Retour valide, ou message d'erreur à afficher
export function parseFeedback(body: unknown, userAgent: unknown): FeedbackInput | string {
    const b = (body ?? {}) as Record<string, unknown>;
    if (!FEEDBACK_KINDS.includes(b.kind as FeedbackKind)) return "Choisis « Bug » ou « Idée »";
    const message = typeof b.message === "string" ? b.message.trim() : "";
    if (message.length < FEEDBACK_MIN) return "Ton message est trop court";
    if (message.length > FEEDBACK_MAX) return `Ton message dépasse ${FEEDBACK_MAX} caractères`;
    return {kind: b.kind as FeedbackKind, message, page: cut(b.page, 200), userAgent: cut(userAgent, 300)};
}
