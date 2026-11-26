import {GiCheeseWedge} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const vinsFromages: QuizzTopic = {
    id: "vins-fromages",
    name: "Vins et fromages",
    description: "Terroirs, appellations et plateaux de fromages",
    category: "culture",
    icon: GiCheeseWedge,
    color: "#a21caf",
    wiki: {
        summary: [
            "La France est l'un des premiers producteurs de vin au monde, avec des régions prestigieuses comme le Bordelais, la Bourgogne, la Champagne, la vallée du Rhône ou l'Alsace.",
            "On dit qu'elle compte plus de 1 000 fromages différents. Le général de Gaulle se demandait comment gouverner un pays qui en a 246 variétés.",
        ],
        facts: [
            ["Grandes régions viticoles", "Bordeaux, Bourgogne, Champagne, Rhône"],
            ["Fromages AOP", "Plus de 45"],
            ["Label", "Appellation d'origine protégée (AOP)"],
            ["Vin effervescent", "Le champagne"],
        ],
        url: "https://fr.wikipedia.org/wiki/Viticulture_en_France",
    },
};
