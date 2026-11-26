/*
 * Quizz : thèmes créés par les joueurs (page /quizz/creer). Règles du brouillon (souples : on enregistre tout,
 * même à moitié fait) et de la soumission (strictes : tout doit être bon). Partagé avec le site.
 */
import {QUIZZ_TOPIC_NAMES, questionProblem, ANSWER_MAX, QUESTION_MAX} from "./quizz.js";
import {isMixSlug} from "./quizzMixes.js";

// Catégories des thèmes (src/Components/Quizz/topics/types.ts, même ordre) : un test du site vérifie la liste
export const THEME_CATEGORIES = ["cinema", "series", "jeux-video", "livres", "anime", "musique", "sport", "internet", "culture"] as const;
export type ThemeCategory = typeof THEME_CATEGORIES[number];

// Couleurs proposées pour un thème
export const THEME_COLORS = ["#facc15", "#f97316", "#dc2626", "#db2777", "#9333ea", "#2563eb", "#22d3ee", "#16a34a", "#84cc16", "#94a3b8"] as const;

export const THEME_NAME_MIN = 2;
export const THEME_NAME_MAX = 40;
export const THEME_DESCRIPTION_MAX = 120;
export const THEME_MIN_QUESTIONS = 30;
export const THEME_MAX_QUESTIONS = 300;
// brouillons (et thèmes soumis) en cours par joueur, au plus
export const THEME_DRAFTS_MAX = 10;

// Adresses de /quizz/… déjà prises par des pages
const RESERVED_SLUGS = ["creer", "nouveau", "brouillons", "duel"];

export type ThemeQuestion = { question: string; answers: [string, string, string, string] };

export type ThemeDraft = {
    name: string;
    description: string;
    category: string;
    color: string;
    wikiUrl: string;
    questions: ThemeQuestion[];
};

const text = (value: unknown, max: number): string =>
    typeof value === "string" ? value.replace(/\s+/g, " ").trimStart().slice(0, max) : "";

// Brouillon : on garde ce qui a été écrit (coupé aux tailles maximales), sans rien refuser
export function parseDraft(body: unknown): ThemeDraft {
    const b = (body ?? {}) as Record<string, unknown>;
    const list = Array.isArray(b.questions) ? b.questions.slice(0, THEME_MAX_QUESTIONS) : [];
    return {
        name: text(b.name, THEME_NAME_MAX),
        description: text(b.description, THEME_DESCRIPTION_MAX),
        category: (THEME_CATEGORIES as readonly string[]).includes(b.category as string) ? b.category as string : "",
        color: (THEME_COLORS as readonly string[]).includes(b.color as string) ? b.color as string : "",
        wikiUrl: text(b.wikiUrl, 300).trim(),
        questions: list.map(item => {
            const q = (item ?? {}) as Record<string, unknown>;
            const answers = Array.isArray(q.answers) ? q.answers : [];
            return {
                question: text(q.question, QUESTION_MAX),
                answers: [0, 1, 2, 3].map(i => text(answers[i], ANSWER_MAX)) as ThemeQuestion["answers"],
            };
        }),
    };
}

// Lien vers un article de Wikipédia (toutes les langues) : { langue, titre de l'article } ou null
export function parseWikiUrl(url: string): { lang: string; title: string } | null {
    let parsed: URL;
    try {
        parsed = new URL(url.trim());
    } catch {
        return null;
    }
    const host = /^([a-z-]{2,12})(?:\.m)?\.wikipedia\.org$/.exec(parsed.hostname);
    const path = /^\/wiki\/(.+)$/.exec(parsed.pathname);
    if (parsed.protocol !== "https:" || !host || !path) return null;
    let title: string;
    try {
        title = decodeURIComponent(path[1]!).replace(/_/g, " ").trim();
    } catch {
        return null;
    }
    if (!title || title.includes(":") && /^(Spécial|Special|Fichier|File|Catégorie|Category|Aide|Help|Portail|Portal|Wikipédia|Wikipedia|Modèle|Template|Discussion|Talk):/i.test(title)) return null;
    return {lang: host[1]!, title};
}

const clean = (s: string) => s.trim().replace(/\s+/g, " ");

// Questions remplies (cartes entièrement vides ignorées), nettoyées
export function filledQuestions(questions: ThemeQuestion[]): ThemeQuestion[] {
    return questions
        .filter(q => clean(q.question) || q.answers.some(a => clean(a)))
        .map(q => ({question: clean(q.question), answers: q.answers.map(clean) as ThemeQuestion["answers"]}));
}

// Ce qui manque pour soumettre (vide : tout est bon). Mêmes messages sur le site et le serveur.
export function themeProblems(draft: ThemeDraft, wikiOk: boolean): string[] {
    const problems: string[] = [];
    const name = clean(draft.name);
    if (name.length < THEME_NAME_MIN) problems.push("Donne un nom au thème");
    if (!clean(draft.description)) problems.push("Écris une phrase de présentation");
    if (!draft.category) problems.push("Choisis une catégorie");
    if (!draft.color) problems.push("Choisis une couleur");
    if (!wikiOk) problems.push("Ajoute le lien d'un article Wikipédia sur le thème");
    const questions = filledQuestions(draft.questions);
    const invalid = questions.filter(q => questionProblem(q)).length;
    if (invalid > 0) problems.push(invalid > 1 ? `${invalid} questions sont à corriger` : "Une question est à corriger");
    const valid = questions.length - invalid;
    if (valid < THEME_MIN_QUESTIONS) {
        problems.push(`Encore ${THEME_MIN_QUESTIONS - valid} question${THEME_MIN_QUESTIONS - valid > 1 ? "s" : ""} (${THEME_MIN_QUESTIONS} au minimum)`);
    }
    const texts = questions.map(q => q.question.toLowerCase());
    if (new Set(texts).size !== texts.length) problems.push("Deux questions sont identiques");
    return problems;
}

// Identifiant d'adresse tiré du nom : « Le Seigneur des Anneaux » → le-seigneur-des-anneaux
export function themeSlug(name: string): string {
    return name.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50).replace(/-+$/, "");
}

// Slug libre ? (ni un thème du site, ni une page, ni un mélange de thèmes, ni un thème déjà validé)
export const slugReserved = (slug: string) => !slug || RESERVED_SLUGS.includes(slug) || isMixSlug(slug) || Object.hasOwn(QUIZZ_TOPIC_NAMES, slug);

// Introduction de l'article : 3 paragraphes au plus, 1 500 caractères au plus
export function summaryParagraphs(extract: string): string[] {
    const out: string[] = [];
    let total = 0;
    for (const p of extract.split(/\n+/).map(s => s.trim()).filter(s => s.length > 40)) {
        if (out.length === 3 || total + p.length > 1500) break;
        out.push(p);
        total += p.length;
    }
    if (out.length === 0 && extract.trim()) out.push(extract.trim().slice(0, 1500));
    return out;
}
