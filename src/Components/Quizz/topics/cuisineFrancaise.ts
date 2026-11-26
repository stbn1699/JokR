import {GiCroissant} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const cuisineFrancaise: QuizzTopic = {
    id: "cuisine-francaise",
    name: "Cuisine française",
    description: "Spécialités régionales, pâtisseries et grands chefs",
    category: "culture",
    icon: GiCroissant,
    color: "#d97706",
    wiki: {
        summary: [
            "La gastronomie française est inscrite au patrimoine culturel immatériel de l'humanité par l'UNESCO depuis 2010. Chaque région a ses spécialités : bouillabaisse à Marseille, choucroute en Alsace, cassoulet dans le Sud-Ouest, crêpes en Bretagne.",
            "Ses grands chefs, de Paul Bocuse à Alain Ducasse, et ses pâtisseries (croissant, macaron, éclair) sont célèbres dans le monde entier.",
        ],
        facts: [
            ["Patrimoine UNESCO", "Le repas gastronomique des Français (2010)"],
            ["Guide célèbre", "Le Guide Michelin"],
            ["Chef emblématique", "Paul Bocuse"],
            ["Récompense", "Les étoiles Michelin"],
        ],
        url: "https://fr.wikipedia.org/wiki/Cuisine_française",
    },
};
