import {GiCrossedSwords} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const leagueOfLegends: QuizzTopic = {
    id: "league-of-legends",
    name: "League of Legends",
    description: "La Faille de l'invocateur et ses champions",
    category: "jeux-video",
    icon: GiCrossedSwords,
    color: "#0891b2",
    wiki: {
        summary: [
            "League of Legends (LoL) est un jeu vidéo d'arène de bataille en ligne (MOBA) développé par Riot Games, sorti en 2009. Deux équipes de cinq champions s'affrontent sur la Faille de l'invocateur pour détruire le Nexus adverse.",
            "C'est l'un des jeux les plus joués au monde et le pilier de l'e-sport : son championnat du monde, les Worlds, attire des millions de spectateurs chaque année.",
        ],
        facts: [
            ["Développeur", "Riot Games"],
            ["Sortie", "27 octobre 2009"],
            ["Genre", "MOBA"],
            ["Carte principale", "La Faille de l'invocateur"],
        ],
        url: "https://fr.wikipedia.org/wiki/League_of_Legends",
    },
};
