import {GiTrophyCup} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const ligueDesChampions: QuizzTopic = {
    id: "ligue-des-champions",
    name: "Ligue des champions",
    description: "La plus prestigieuse coupe d'Europe des clubs",
    category: "sport",
    icon: GiTrophyCup,
    color: "#1e3a8a",
    wiki: {
        summary: [
            "La Ligue des champions de l'UEFA est la plus prestigieuse compétition européenne de clubs de football. Créée en 1955 sous le nom de Coupe des clubs champions européens, elle prend son nom actuel en 1992.",
            "Le Real Madrid en est le club le plus titré. Les seuls clubs français vainqueurs sont l'Olympique de Marseille (1993) et le Paris Saint-Germain (2025).",
        ],
        facts: [
            ["Création", "1955"],
            ["Organisateur", "UEFA"],
            ["Club le plus titré", "Real Madrid"],
            ["Clubs français vainqueurs", "OM (1993), PSG (2025)"],
        ],
        url: "https://fr.wikipedia.org/wiki/Ligue_des_champions_de_l'UEFA",
    },
};
