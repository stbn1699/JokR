import {GiCyberEye} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const cyberpunk: QuizzTopic = {
    id: "cyberpunk",
    name: "Cyberpunk",
    description: "Night City, ses fixers et ses netrunners",
    category: "jeux-video",
    icon: GiCyberEye,
    color: "#22d3ee",
    wiki: {
        summary: [
            "Cyberpunk 2077 est un jeu vidéo de rôle en monde ouvert développé par le studio polonais CD Projekt Red, sorti en décembre 2020. On y incarne V, un mercenaire de Night City, une mégapole californienne rongée par la violence et dominée par les corporations.",
            "Après un vol qui tourne mal, V se retrouve avec dans la tête la puce d'un rockeur mort depuis cinquante ans, Johnny Silverhand, joué par Keanu Reeves.",
            "Le jeu s'inspire du jeu de rôle papier Cyberpunk créé par Mike Pondsmith en 1988. Il a reçu l'extension Phantom Liberty en 2023 et la série animée Cyberpunk: Edgerunners, du studio Trigger, en 2022.",
        ],
        facts: [
            ["Développeur", "CD Projekt Red"],
            ["Sortie", "10 décembre 2020"],
            ["Genre", "Jeu de rôle, monde ouvert"],
            ["Extension", "Phantom Liberty (2023)"],
            ["Univers d'origine", "Le jeu de rôle Cyberpunk de Mike Pondsmith (1988)"],
        ],
        url: "https://fr.wikipedia.org/wiki/Cyberpunk_2077",
    },
    questions: [
        {question: "Dans quelle ville se déroule Cyberpunk 2077 ?", answers: ["Night City", "Neo-Tokyo", "Detroit", "Los Santos"]},
        {question: "Quel acteur joue Johnny Silverhand ?", answers: ["Keanu Reeves", "Ryan Gosling", "Tom Hardy", "Rutger Hauer"]},
        {question: "Quel studio a développé Cyberpunk 2077 ?", answers: ["CD Projekt Red", "Ubisoft", "Rockstar Games", "Bethesda"]},
        {question: "Comment s'appelle le groupe de rock de Johnny Silverhand ?", answers: ["Samurai", "Ronin", "Shogun", "Katana"]},
        {question: "Quelle mégacorporation japonaise règne sur Night City ?", answers: ["Arasaka", "Militech", "Kang Tao", "Biotechnica"]},
        {question: "Comment s'appelle la puce qui renferme l'engramme de Johnny ?", answers: ["La Relique", "Le Fragment", "L'Oracle", "Le Sésame"]},
        {question: "Avec qui V vole-t-il la puce à l'hôtel Konpeki Plaza ?", answers: ["Jackie Welles", "Judy Alvarez", "Panam Palmer", "Kerry Eurodyne"]},
        {question: "Qui a créé le jeu de rôle papier Cyberpunk, à l'origine du jeu vidéo ?", answers: ["Mike Pondsmith", "William Gibson", "Philip K. Dick", "Hideo Kojima"]},
        {question: "Comment s'appelle la série animée sortie en 2022 dans l'univers de Cyberpunk ?", answers: ["Cyberpunk: Edgerunners", "Cyberpunk: Netrunners", "Night City Blues", "Neon Ronin"]},
        {question: "Comment appelle-t-on les hackers qui plongent dans le Net ?", answers: ["Les netrunners", "Les fixers", "Les nomades", "Les solos"]},
    ],
};
