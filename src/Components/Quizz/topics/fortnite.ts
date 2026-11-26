import {GiParachute} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const fortnite: QuizzTopic = {
    id: "fortnite",
    name: "Fortnite",
    description: "Le battle royale du bus volant et des constructions",
    category: "jeux-video",
    icon: GiParachute,
    color: "#8b5cf6",
    wiki: {
        summary: [
            "Fortnite est un jeu vidéo développé par Epic Games, sorti en 2017. Son mode Battle Royale, gratuit, fait sauter cent joueurs d'un bus volant sur une île où le dernier survivant gagne, pendant qu'une tempête réduit la zone de jeu.",
            "Le jeu se distingue par la construction de structures en plein combat, ses danses (emotes), ses collaborations avec des stars et ses concerts virtuels.",
        ],
        facts: [
            ["Développeur", "Epic Games"],
            ["Sortie", "2017"],
            ["Mode phare", "Battle Royale (gratuit)"],
            ["Moteur", "Unreal Engine"],
        ],
        url: "https://fr.wikipedia.org/wiki/Fortnite",
    },
};
