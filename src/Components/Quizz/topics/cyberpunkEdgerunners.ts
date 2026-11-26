import {GiMoon} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const cyberpunkEdgerunners: QuizzTopic = {
    id: "cyberpunk-edgerunners",
    name: "Cyberpunk: Edgerunners",
    description: "David, Lucy et la bande de mercenaires de Night City",
    category: "series",
    icon: GiMoon,
    color: "#facc15",
    wiki: {
        summary: [
            "Cyberpunk: Edgerunners est une série d'animation japonaise du studio Trigger, diffusée sur Netflix en septembre 2022. Elle se déroule à Night City, dans l'univers du jeu Cyberpunk 2077 de CD Projekt Red.",
            "Après un drame familial, le jeune David Martinez se fait greffer un implant militaire, le Sandevistan, et rejoint une équipe de mercenaires (edgerunners) menée par Maine. Il y rencontre Lucy, une netrunneuse qui rêve d'aller sur la Lune.",
        ],
        facts: [
            ["Studio", "Trigger"],
            ["Plateforme", "Netflix"],
            ["Sortie", "13 septembre 2022"],
            ["Épisodes", "10"],
        ],
        url: "https://fr.wikipedia.org/wiki/Cyberpunk:_Edgerunners",
    },
};
