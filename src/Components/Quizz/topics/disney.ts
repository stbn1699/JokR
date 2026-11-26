import {GiMagicLamp} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const disney: QuizzTopic = {
    id: "disney",
    name: "Disney",
    description: "Les grands classiques d'animation de Blanche-Neige à La Reine des neiges",
    category: "cinema",
    icon: GiMagicLamp,
    color: "#7c3aed",
    wiki: {
        summary: [
            "Les Classiques d'animation Disney sont les longs métrages produits par Walt Disney Animation Studios, depuis Blanche-Neige et les Sept Nains en 1937, premier long métrage d'animation en couleur de l'histoire.",
            "Ils couvrent près d'un siècle de cinéma : l'âge d'or (Pinocchio, Bambi), la renaissance des années 1990 (La Petite Sirène, Le Roi lion, Aladdin) et les succès récents comme Raiponce, La Reine des neiges ou Encanto.",
        ],
        facts: [
            ["Studio", "Walt Disney Animation Studios"],
            ["Premier classique", "Blanche-Neige et les Sept Nains (1937)"],
            ["Fondateur", "Walt Disney"],
            ["Mascotte", "Mickey Mouse"],
        ],
        url: "https://fr.wikipedia.org/wiki/Liste_des_longs-métrages_d'animation_Disney",
    },
};
