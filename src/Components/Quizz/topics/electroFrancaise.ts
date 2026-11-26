import {GiHeadphones} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const electroFrancaise: QuizzTopic = {
    id: "electro-francaise",
    name: "Électro",
    description: "French touch, DJ stars et musique électronique",
    category: "musique",
    icon: GiHeadphones,
    color: "#06b6d4",
    wiki: {
        summary: [
            "La musique électronique est créée principalement avec des instruments électroniques : synthétiseurs, boîtes à rythmes et ordinateurs. Elle se décline en house, techno, trance, drum and bass ou dubstep.",
            "La France a marqué le genre avec Jean-Michel Jarre puis la French touch des années 1990 (Daft Punk, Air, Cassius, Bob Sinclar), avant les succès mondiaux de David Guetta, Justice ou DJ Snake.",
        ],
        facts: [
            ["Pionnier français", "Jean-Michel Jarre"],
            ["Mouvement", "La French touch (années 1990)"],
            ["Genres", "House, techno, trance, dubstep"],
            ["Instrument clé", "Le synthétiseur"],
        ],
        url: "https://fr.wikipedia.org/wiki/French_touch",
    },
};
