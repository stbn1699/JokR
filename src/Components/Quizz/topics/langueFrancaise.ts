import {GiSpellBook} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const langueFrancaise: QuizzTopic = {
    id: "langue-francaise",
    name: "Langue française",
    description: "Expressions, orthographe et mots d'origine surprenante",
    category: "culture",
    icon: GiSpellBook,
    color: "#2563eb",
    wiki: {
        summary: [
            "Le français est une langue romane, issue du latin parlé en Gaule. Il est parlé par plus de 320 millions de personnes dans le monde et est langue officielle dans 29 pays.",
            "Sa richesse en expressions imagées, souvent héritées de l'histoire, fait le bonheur des amateurs de mots.",
        ],
        facts: [
            ["Origine", "Le latin"],
            ["Locuteurs", "Plus de 320 millions"],
            ["Pays (langue officielle)", "29"],
            ["Gardienne", "L'Académie française"],
        ],
        url: "https://fr.wikipedia.org/wiki/Français",
    },
};
