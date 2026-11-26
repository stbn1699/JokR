import type {IconType} from "react-icons";

/**
 * Une question de quiz : la bonne réponse est toujours écrite en premier dans `answers`,
 * les réponses sont mélangées au moment de la partie (voir quizzMatch.ts).
 * Question en image (« Quelle est cette planète ? ») : `image` est l'adresse d'un fichier de public/
 * (ex. /quizz/star-wars/tatooine.svg), affiché sous la question.
 */
export type QuizzQuestion = {
    question: string;
    // 4 réponses, la bonne en premier
    answers: [string, string, string, string];
    image?: string;
};

// Grandes familles de thèmes, dans l'ordre d'affichage de la page Quizz
export const QUIZZ_CATEGORIES = [
    {id: "cinema", label: "Cinéma"},
    {id: "jeux-video", label: "Jeux vidéo"},
    {id: "livres", label: "Livres"},
] as const;

export type QuizzCategory = typeof QUIZZ_CATEGORIES[number]["id"];

/**
 * Fiche du thème, façon encyclopédie (page /quizz/<id>) : quelques paragraphes, une infobox et le lien
 * vers l'article Wikipédia.
 */
export type QuizzWiki = {
    summary: string[];
    // lignes de l'infobox : [intitulé, valeur]
    facts: [string, string][];
    url: string;
};

/**
 * Un thème (comme un « topic » de QuizUp) : un fichier par thème dans ce dossier, ajouté à la liste de index.ts.
 * `id` sert dans l'adresse (/quizz/<id>) : ne plus le changer une fois publié.
 */
export type QuizzTopic = {
    id: string;
    name: string;
    // phrase sous le nom, sur la carte du thème
    description: string;
    category: QuizzCategory;
    icon: IconType;
    // couleur du thème (carte, en-tête de la partie)
    color: string;
    wiki: QuizzWiki;
    questions: QuizzQuestion[];
};
