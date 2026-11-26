import {FaJedi} from "react-icons/fa";
import type {QuizzTopic} from "./types.ts";

export const starWars: QuizzTopic = {
    id: "star-wars",
    name: "Star Wars",
    description: "Une galaxie lointaine, très lointaine…",
    category: "cinema",
    icon: FaJedi,
    color: "#facc15",
    wiki: {
        summary: [
            "Star Wars est une saga de science-fiction imaginée par George Lucas. Tout commence en 1977 avec le film Un nouvel espoir, qui raconte comment Luke Skywalker, un jeune fermier de Tatooine, rejoint la rébellion contre l'Empire galactique.",
            "La saga principale suit la famille Skywalker sur trois trilogies : la chute d'Anakin, qui devient Dark Vador, la victoire de son fils Luke, puis le combat de Rey contre le Premier Ordre. Au centre de tout : la Force, que se disputent les chevaliers Jedi et les Sith.",
            "Rachetée par Disney en 2012 avec Lucasfilm, la franchise s'est étendue en séries (The Mandalorian, Andor…), dessins animés, romans et jeux vidéo.",
        ],
        facts: [
            ["Créateur", "George Lucas"],
            ["Premier film", "Un nouvel espoir (1977)"],
            ["Saga Skywalker", "9 films, de 1977 à 2019"],
            ["Studio", "Lucasfilm (Disney depuis 2012)"],
            ["Musique", "John Williams"],
        ],
        url: "https://fr.wikipedia.org/wiki/Star_Wars",
    },
};
