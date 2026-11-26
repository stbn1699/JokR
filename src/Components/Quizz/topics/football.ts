import {GiSoccerBall} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const football: QuizzTopic = {
    id: "football",
    name: "Football",
    description: "Coupe du monde, Ligue 1 et légendes du ballon rond",
    category: "sport",
    icon: GiSoccerBall,
    color: "#16a34a",
    wiki: {
        summary: [
            "Le football est le sport le plus populaire au monde. Deux équipes de onze joueurs tentent de mettre le ballon dans le but adverse sans utiliser les mains, sauf le gardien.",
            "La Coupe du monde, organisée par la FIFA tous les quatre ans depuis 1930, est la compétition la plus suivie de la planète. La France l'a remportée en 1998 et en 2018.",
        ],
        facts: [
            ["Instance mondiale", "FIFA (fondée à Paris en 1904)"],
            ["Joueurs par équipe", "11"],
            ["Coupe du monde", "Depuis 1930"],
            ["Titres de la France", "1998 et 2018"],
        ],
        url: "https://fr.wikipedia.org/wiki/Football",
    },
};
