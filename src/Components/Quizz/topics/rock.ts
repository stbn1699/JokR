import {GiGuitar} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const rock: QuizzTopic = {
    id: "rock",
    name: "Rock",
    description: "Des Rolling Stones à Nirvana, les légendes du rock",
    category: "musique",
    icon: GiGuitar,
    color: "#dc2626",
    wiki: {
        summary: [
            "Le rock est un genre musical né aux États-Unis dans les années 1950, avec Elvis Presley, Chuck Berry et Little Richard. Les années 1960 et 1970 voient l'explosion du rock britannique : les Beatles, les Rolling Stones, Led Zeppelin, Pink Floyd ou Queen.",
            "Le genre se décline en hard rock, punk, metal, grunge ou rock alternatif, avec des groupes comme AC/DC, Nirvana, Metallica ou Muse.",
        ],
        facts: [
            ["Origine", "États-Unis, années 1950"],
            ["Roi du rock", "Elvis Presley"],
            ["Instrument emblème", "La guitare électrique"],
            ["Temple", "Rock and Roll Hall of Fame (Cleveland)"],
        ],
        url: "https://fr.wikipedia.org/wiki/Rock",
    },
};
