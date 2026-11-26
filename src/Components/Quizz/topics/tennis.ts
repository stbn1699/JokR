import {GiTennisRacket} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const tennis: QuizzTopic = {
    id: "tennis",
    name: "Tennis",
    description: "Roland-Garros, Wimbledon et les géants de la raquette",
    category: "sport",
    icon: GiTennisRacket,
    color: "#ea580c",
    wiki: {
        summary: [
            "Le tennis est un sport de raquette qui oppose deux joueurs (simple) ou deux équipes de deux (double). Les quatre tournois du Grand Chelem sont l'Open d'Australie, Roland-Garros, Wimbledon et l'US Open.",
            "Roger Federer, Rafael Nadal et Novak Djokovic, le « Big Three », ont dominé le tennis masculin pendant près de vingt ans. Chez les femmes, Serena Williams et Steffi Graf ont marqué l'histoire.",
        ],
        facts: [
            ["Grand Chelem", "Melbourne, Paris, Londres, New York"],
            ["Record masculin", "Novak Djokovic (24 titres du Grand Chelem)"],
            ["Roi de la terre battue", "Rafael Nadal (14 Roland-Garros)"],
            ["Compter les points", "15, 30, 40, jeu"],
        ],
        url: "https://fr.wikipedia.org/wiki/Tennis",
    },
};
