/*
 * Quizz : questions proposées par les joueurs, vérification de ce qu'envoie le formulaire.
 * Partagé avec le site (src/Components/Quizz) : mêmes limites des deux côtés.
 */

// Thèmes existants (src/Components/Quizz/topics), id → nom : un test du site vérifie que la liste est à jour
export const QUIZZ_TOPIC_NAMES: Record<string, string> = {
    "star-wars": "Star Wars",
    "harry-potter": "Harry Potter",
    "cyberpunk": "Cyberpunk",
    "cars": "Cars",
};
export const QUIZZ_TOPIC_IDS = Object.keys(QUIZZ_TOPIC_NAMES);

// Crédits offerts à l'auteur d'une question validée (avec une notification)
export const QUIZZ_APPROVED_CREDITS = 10;

export const QUESTION_MIN = 5;
export const QUESTION_MAX = 200;
export const ANSWER_MAX = 80;
// questions envoyées d'un coup, au plus (le formulaire en ajoute autant qu'on veut avec « + »)
export const BATCH_MAX = 100;

export const isQuizzTopic = (id: string): boolean => Object.hasOwn(QUIZZ_TOPIC_NAMES, id);

// Une question : 4 réponses, la bonne en premier
export type QuestionInput = { question: string; answers: [string, string, string, string] };

const clean = (value: unknown): string => (typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "");

// Problème d'une question (texte à afficher), ou null si elle est bonne
export function questionProblem(q: { question: string; answers: string[] }): string | null {
    if (q.question.length < QUESTION_MIN) return "La question est trop courte";
    if (q.question.length > QUESTION_MAX) return `La question dépasse ${QUESTION_MAX} caractères`;
    if (q.answers.length !== 4 || q.answers.some(a => !a)) return "Il faut remplir les 4 réponses";
    if (q.answers.some(a => a.length > ANSWER_MAX)) return `Une réponse dépasse ${ANSWER_MAX} caractères`;
    if (new Set(q.answers.map(a => a.toLowerCase())).size !== 4) return "Les 4 réponses doivent être différentes";
    return null;
}

export function parseQuestion(body: unknown): QuestionInput | string {
    const b = (body ?? {}) as Record<string, unknown>;
    const answers = Array.isArray(b.answers) ? b.answers.map(clean) : [];
    const q = {question: clean(b.question), answers};
    const problem = questionProblem(q);
    return problem ?? {question: q.question, answers: answers as QuestionInput["answers"]};
}

// Envoi de plusieurs questions d'un coup : toutes valides, ou le message de la première fautive (« Question 3 : … »)
export function parseQuestions(body: unknown): QuestionInput[] | string {
    const list = (body as { questions?: unknown } | null)?.questions;
    if (!Array.isArray(list) || list.length === 0) return "Ajoute au moins une question";
    if (list.length > BATCH_MAX) return `${BATCH_MAX} questions au plus par envoi`;
    const out: QuestionInput[] = [];
    for (const [i, item] of list.entries()) {
        const q = parseQuestion(item);
        if (typeof q === "string") return `Question ${i + 1} : ${q.charAt(0).toLowerCase()}${q.slice(1)}`;
        out.push(q);
    }
    return out;
}

export type ReviewInput = { status: "approved" | "rejected"; edit: QuestionInput | null };

// Décision de l'administrateur : valider (éventuellement après correction) ou refuser
export function parseReview(body: unknown): ReviewInput | string {
    const b = (body ?? {}) as Record<string, unknown>;
    if (b.status !== "approved" && b.status !== "rejected") return "Choisis « Valider » ou « Refuser »";
    if (b.question === undefined && b.answers === undefined) return {status: b.status, edit: null};
    const edit = parseQuestion(b);
    return typeof edit === "string" ? edit : {status: b.status, edit};
}
