import {GiRugbyConversion} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const rugby: QuizzTopic = {
    id: "rugby",
    name: "Rugby",
    description: "Le Tournoi des Six Nations, le XV de France et les All Blacks",
    category: "sport",
    icon: GiRugbyConversion,
    color: "#1e40af",
    wiki: {
        summary: [
            "Le rugby à XV est un sport collectif né en Angleterre au XIXe siècle, dans la ville de Rugby selon la légende. Deux équipes de quinze joueurs portent le ballon ovale vers l'en-but adverse pour marquer un essai.",
            "Le Tournoi des Six Nations et la Coupe du monde, remportée le plus souvent par l'Afrique du Sud et la Nouvelle-Zélande, sont les grandes compétitions internationales.",
        ],
        facts: [
            ["Origine", "Angleterre, XIXe siècle"],
            ["Joueurs", "15 par équipe"],
            ["Coupe du monde", "Depuis 1987"],
            ["Championnat français", "Le Top 14"],
        ],
        url: "https://fr.wikipedia.org/wiki/Rugby_à_XV",
    },
};
