import {GiMusicalScore} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const varieteFrancaise: QuizzTopic = {
    id: "variete-francaise",
    name: "Chanson française",
    description: "De Piaf à Stromae, les voix qui ont marqué la France",
    category: "musique",
    icon: GiMusicalScore,
    color: "#2563eb",
    wiki: {
        summary: [
            "La chanson française désigne la chanson à texte et la variété en langue française. Elle a été portée par Édith Piaf, Charles Trenet, Georges Brassens, Jacques Brel, Serge Gainsbourg, Charles Aznavour ou Barbara.",
            "Des yéyés des années 1960 aux artistes d'aujourd'hui comme Stromae, Angèle ou Zaz, elle reste un pilier de la culture francophone.",
        ],
        facts: [
            ["Grandes voix", "Piaf, Aznavour, Brel, Brassens"],
            ["Années yéyé", "1960"],
            ["Récompense", "Les Victoires de la musique"],
            ["Quota radio", "40 % de chansons francophones"],
        ],
        url: "https://fr.wikipedia.org/wiki/Chanson_française",
    },
};
