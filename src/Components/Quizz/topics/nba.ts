import {GiBasketballBall} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const nba: QuizzTopic = {
    id: "nba",
    name: "NBA",
    description: "Michael Jordan, LeBron James et le basket américain",
    category: "sport",
    icon: GiBasketballBall,
    color: "#ea580c",
    wiki: {
        summary: [
            "La National Basketball Association (NBA) est la ligue professionnelle de basket-ball d'Amérique du Nord, fondée en 1946. Trente équipes y disputent une saison régulière puis les playoffs, conclus par les Finales NBA.",
            "Michael Jordan, Magic Johnson, Kareem Abdul-Jabbar, Kobe Bryant ou LeBron James en sont les légendes. Le Français Victor Wembanyama y fait sensation depuis 2023.",
        ],
        facts: [
            ["Fondation", "1946"],
            ["Équipes", "30"],
            ["Records de titres", "Celtics et Lakers"],
            ["Meilleur marqueur de l'histoire", "LeBron James"],
        ],
        url: "https://fr.wikipedia.org/wiki/National_Basketball_Association",
    },
};
