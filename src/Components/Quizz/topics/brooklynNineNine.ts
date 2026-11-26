import {GiPoliceBadge} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const brooklynNineNine: QuizzTopic = {
    id: "brooklyn-nine-nine",
    name: "Brooklyn Nine-Nine",
    description: "Jake Peralta, le capitaine Holt et le 99e district",
    category: "series",
    icon: GiPoliceBadge,
    color: "#1d4ed8",
    wiki: {
        summary: [
            "Brooklyn Nine-Nine est une sitcom policière américaine créée par Dan Goor et Michael Schur, diffusée de 2013 à 2021 sur Fox puis NBC. Elle suit les inspecteurs du 99e district de police de Brooklyn, à New York.",
            "Le brillant mais immature Jake Peralta y travaille sous les ordres de l'impassible capitaine Raymond Holt, entouré d'Amy Santiago, Rosa Diaz, Charles Boyle, Terry Jeffords, Gina Linetti et du duo Hitchcock et Scully.",
        ],
        facts: [
            ["Créateurs", "Dan Goor et Michael Schur"],
            ["Chaînes", "Fox puis NBC"],
            ["Diffusion", "2013 – 2021"],
            ["Saisons", "8 (153 épisodes)"],
        ],
        url: "https://fr.wikipedia.org/wiki/Brooklyn_Nine-Nine",
    },
};
