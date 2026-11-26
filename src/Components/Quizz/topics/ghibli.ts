import {GiForest} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const ghibli: QuizzTopic = {
    id: "ghibli",
    name: "Studio Ghibli",
    description: "Totoro, Chihiro, Princesse Mononoké et Hayao Miyazaki",
    category: "anime",
    icon: GiForest,
    color: "#059669",
    wiki: {
        summary: [
            "Le Studio Ghibli est un studio d'animation japonais fondé en 1985 par Hayao Miyazaki, Isao Takahata et Toshio Suzuki. Ses films, dessinés à la main, mêlent poésie, nature, merveilleux et réflexion sur la guerre et l'écologie.",
            "Le Voyage de Chihiro a remporté l'Oscar du meilleur film d'animation en 2003, puis Le Garçon et le Héron en 2024. La mascotte du studio est Totoro.",
        ],
        facts: [
            ["Fondation", "1985"],
            ["Fondateurs", "Hayao Miyazaki, Isao Takahata, Toshio Suzuki"],
            ["Mascotte", "Totoro"],
            ["Compositeur", "Joe Hisaishi"],
        ],
        url: "https://fr.wikipedia.org/wiki/Studio_Ghibli",
    },
};
