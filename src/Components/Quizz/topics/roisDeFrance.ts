import {GiCrown} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const roisDeFrance: QuizzTopic = {
    id: "rois-de-france",
    name: "Rois de France",
    description: "Mérovingiens, Carolingiens, Capétiens, Valois et Bourbons",
    category: "culture",
    icon: GiCrown,
    color: "#a16207",
    wiki: {
        summary: [
            "La France a été gouvernée par des rois pendant plus de mille ans, de Clovis aux Bourbons. Les grandes dynasties sont les Mérovingiens, les Carolingiens et les Capétiens, avec leurs branches des Valois et des Bourbons.",
            "La monarchie est abolie en 1792. Elle revient brièvement avec la Restauration (Louis XVIII, Charles X) et la monarchie de Juillet (Louis-Philippe), jusqu'en 1848.",
        ],
        facts: [
            ["Premier roi franc", "Clovis"],
            ["Dynastie fondée en 987", "Les Capétiens (Hugues Capet)"],
            ["Plus long règne", "Louis XIV (72 ans)"],
            ["Dernier roi", "Louis-Philippe Ier (1848)"],
        ],
        url: "https://fr.wikipedia.org/wiki/Liste_des_monarques_de_France",
    },
};
