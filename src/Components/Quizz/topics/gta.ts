import {GiPoliceCar} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const gta: QuizzTopic = {
    id: "gta",
    name: "GTA",
    description: "Grand Theft Auto, de Liberty City à Vice City",
    category: "jeux-video",
    icon: GiPoliceCar,
    color: "#16a34a",
    wiki: {
        summary: [
            "Grand Theft Auto (GTA) est une série de jeux vidéo d'action en monde ouvert développée par Rockstar North et éditée par Rockstar Games depuis 1997. Le joueur y incarne des criminels dans des villes inspirées des États-Unis.",
            "GTA V, sorti en 2013, est l'un des jeux les plus vendus de l'histoire. GTA VI, qui se déroule à Vice City, est l'un des jeux les plus attendus de tous les temps.",
        ],
        facts: [
            ["Développeur", "Rockstar North"],
            ["Éditeur", "Rockstar Games"],
            ["Premier jeu", "Grand Theft Auto (1997)"],
            ["Villes", "Liberty City, Vice City, San Andreas"],
        ],
        url: "https://fr.wikipedia.org/wiki/Grand_Theft_Auto",
    },
};
