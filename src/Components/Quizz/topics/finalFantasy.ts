import {GiCrystalGrowth} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const finalFantasy: QuizzTopic = {
    id: "final-fantasy",
    name: "Final Fantasy",
    description: "Cristaux, chocobos et invocations",
    category: "jeux-video",
    icon: GiCrystalGrowth,
    color: "#2563eb",
    wiki: {
        summary: [
            "Final Fantasy est une série de jeux vidéo de rôle créée par Hironobu Sakaguchi et éditée par Square (devenu Square Enix), lancée en 1987. Chaque épisode principal raconte une histoire et un monde différents.",
            "On y retrouve pourtant des éléments communs : les chocobos, les mogs, les cristaux, les invocations et un personnage nommé Cid. Final Fantasy VII (1997) est l'épisode le plus célèbre.",
        ],
        facts: [
            ["Créateur", "Hironobu Sakaguchi"],
            ["Éditeur", "Square Enix"],
            ["Premier jeu", "Final Fantasy (1987)"],
            ["Compositeur historique", "Nobuo Uematsu"],
        ],
        url: "https://fr.wikipedia.org/wiki/Final_Fantasy",
    },
};
