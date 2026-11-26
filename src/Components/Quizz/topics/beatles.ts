import {GiScarabBeetle} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const beatles: QuizzTopic = {
    id: "beatles",
    name: "Les Beatles",
    description: "John, Paul, George et Ringo",
    category: "musique",
    icon: GiScarabBeetle,
    color: "#0f172a",
    wiki: {
        summary: [
            "Les Beatles sont un groupe de rock britannique formé à Liverpool en 1960, composé de John Lennon, Paul McCartney, George Harrison et Ringo Starr. Ils sont le groupe le plus vendu de l'histoire de la musique.",
            "De la « Beatlemania » des débuts à des albums novateurs comme Sgt. Pepper's Lonely Hearts Club Band ou Abbey Road, ils ont profondément transformé la musique populaire avant de se séparer en 1970.",
        ],
        facts: [
            ["Ville", "Liverpool"],
            ["Années actives", "1960 – 1970"],
            ["Membres", "Lennon, McCartney, Harrison, Starr"],
            ["Label", "Parlophone / Apple"],
        ],
        url: "https://fr.wikipedia.org/wiki/The_Beatles",
    },
};
