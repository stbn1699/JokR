import {GiHexes} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const arcane: QuizzTopic = {
    id: "arcane",
    name: "Arcane",
    description: "Vi, Jinx, Piltover et Zaun",
    category: "series",
    icon: GiHexes,
    color: "#c026d3",
    wiki: {
        summary: [
            "Arcane est une série d'animation franco-américaine produite par le studio français Fortiche pour Riot Games, diffusée sur Netflix en 2021 et 2024. Elle se déroule dans l'univers du jeu League of Legends.",
            "Elle raconte la séparation de deux sœurs, Vi et Powder (qui deviendra Jinx), entre la cité prospère de Piltover et les bas-fonds de Zaun, sur fond d'invention de l'Hextech. La série a remporté l'Emmy de la meilleure série d'animation.",
        ],
        facts: [
            ["Studio", "Fortiche (Paris)"],
            ["Producteur", "Riot Games"],
            ["Saisons", "2 (2021, 2024)"],
            ["Univers", "League of Legends"],
        ],
        url: "https://fr.wikipedia.org/wiki/Arcane_(série_télévisée)",
    },
};
