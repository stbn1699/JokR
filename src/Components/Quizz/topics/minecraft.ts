import {GiCube} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const minecraft: QuizzTopic = {
    id: "minecraft",
    name: "Minecraft",
    description: "Creepers, diamants et blocs à perte de vue",
    category: "jeux-video",
    icon: GiCube,
    color: "#65a30d",
    wiki: {
        summary: [
            "Minecraft est un jeu vidéo de type bac à sable créé par le Suédois Markus « Notch » Persson et développé par Mojang Studios, sorti officiellement en 2011. Le joueur explore un monde infini fait de blocs, récolte des ressources, fabrique des objets et construit ce qu'il veut.",
            "Racheté par Microsoft en 2014, c'est le jeu vidéo le plus vendu de l'histoire, avec plus de 300 millions d'exemplaires.",
        ],
        facts: [
            ["Créateur", "Markus « Notch » Persson"],
            ["Studio", "Mojang Studios"],
            ["Sortie officielle", "18 novembre 2011"],
            ["Propriétaire", "Microsoft (depuis 2014)"],
        ],
        url: "https://fr.wikipedia.org/wiki/Minecraft",
    },
};
