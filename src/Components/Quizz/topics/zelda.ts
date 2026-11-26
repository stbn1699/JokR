import {GiTriforce} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const zelda: QuizzTopic = {
    id: "zelda",
    name: "Zelda",
    description: "Link, Hyrule et la Triforce",
    category: "jeux-video",
    icon: GiTriforce,
    color: "#16a34a",
    wiki: {
        summary: [
            "The Legend of Zelda est une série de jeux vidéo d'action-aventure créée par Shigeru Miyamoto et Takashi Tezuka chez Nintendo, lancée en 1986. Le héros, Link, explore le royaume d'Hyrule pour sauver la princesse Zelda et combattre Ganon.",
            "La série compte des chefs-d'œuvre comme Ocarina of Time (1998), Breath of the Wild (2017) et Tears of the Kingdom (2023).",
        ],
        facts: [
            ["Créateurs", "Shigeru Miyamoto, Takashi Tezuka"],
            ["Éditeur", "Nintendo"],
            ["Premier jeu", "The Legend of Zelda (1986)"],
            ["Royaume", "Hyrule"],
        ],
        url: "https://fr.wikipedia.org/wiki/The_Legend_of_Zelda",
    },
};
