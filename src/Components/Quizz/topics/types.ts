import type {IconType} from "react-icons";
import {FaBook, FaDragon, FaFilm, FaFutbol, FaGamepad, FaGlobeEurope, FaMusic, FaTv, FaWifi} from "react-icons/fa";

/**
 * Une question de quiz, lue en base (quizz_questions) : la bonne réponse est toujours en premier dans `answers`,
 * les réponses sont mélangées au moment de la partie (voir quizzMatch.ts).
 * Chaque question doit se comprendre seule : elles arrivent dans le désordre.
 */
export type QuizzQuestion = {
    // identifiant fixe de la question (statistiques) : q:<identifiant en base>, voir fromServer (quizzMatch.ts)
    id?: string;
    question: string;
    // 4 réponses, la bonne en premier
    answers: [string, string, string, string];
    // mélange de thèmes (quizzMixes.ts) : le thème d'où vient la question
    topic?: string;
};

// Grandes familles de thèmes, dans l'ordre d'affichage de la page Quizz (une catégorie sans thème n'est pas affichée).
// Même liste que THEME_CATEGORIES (backend/src/utils/quizzThemes.ts) ; `icon` : icône des thèmes créés par les joueurs
export const QUIZZ_CATEGORIES = [
    {id: "cinema", label: "Cinéma", icon: FaFilm},
    {id: "series", label: "Séries", icon: FaTv},
    {id: "jeux-video", label: "Jeux vidéo", icon: FaGamepad},
    {id: "livres", label: "Livres", icon: FaBook},
    {id: "anime", label: "Animés et mangas", icon: FaDragon},
    {id: "musique", label: "Musique", icon: FaMusic},
    {id: "sport", label: "Sport", icon: FaFutbol},
    {id: "internet", label: "Internet", icon: FaWifi},
    {id: "culture", label: "Culture générale", icon: FaGlobeEurope},
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
 * Ses questions ne sont pas ici : elles sont en base (quizz_questions), lues avec usePlayableTopic.
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
    // thème créé par un joueur (page /quizz/creer) : son pseudo ; le texte de la fiche vient de Wikipédia
    creator?: string | null;
    userMade?: boolean;
    // mélange de thèmes (voir quizzMixes.ts) : les thèmes qu'il réunit et le paramètre d'adresse (?themes=… d'une
    // partie custom, vide sinon)
    mix?: { kind: "all" | "category" | "custom"; topics: { id: string; name: string; color: string }[]; query: string };
};

// Thème prêt à jouer : ses questions (toutes en base, celles du site et celles des joueurs) lues sur le serveur
// (voir usePlayableTopic, quizzMixes.ts)
export type PlayableTopic = QuizzTopic & { questions: QuizzQuestion[] };
