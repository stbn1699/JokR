import {GiFedora} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const michaelJackson: QuizzTopic = {
    id: "michael-jackson",
    name: "Michael Jackson",
    description: "Le roi de la pop, le moonwalk et Thriller",
    category: "musique",
    icon: GiFedora,
    color: "#111827",
    wiki: {
        summary: [
            "Michael Jackson (1958-2009) est un chanteur, danseur et compositeur américain surnommé le « roi de la pop ». Enfant star au sein des Jackson Five, il mène ensuite une carrière solo hors norme.",
            "Son album Thriller (1982) est l'album le plus vendu de l'histoire. Ses clips, son moonwalk et son style ont révolutionné la musique populaire.",
        ],
        facts: [
            ["Naissance", "29 août 1958, Gary (Indiana)"],
            ["Décès", "25 juin 2009, Los Angeles"],
            ["Surnom", "Le roi de la pop"],
            ["Album record", "Thriller (1982)"],
        ],
        url: "https://fr.wikipedia.org/wiki/Michael_Jackson",
    },
};
