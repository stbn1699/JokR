import {GiTorch} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const jeuxOlympiques: QuizzTopic = {
    id: "jeux-olympiques",
    name: "Jeux olympiques",
    description: "Anneaux, flamme et records, d'Athènes 1896 à Paris 2024",
    category: "sport",
    icon: GiTorch,
    color: "#0ea5e9",
    wiki: {
        summary: [
            "Les Jeux olympiques modernes, rénovés par le baron Pierre de Coubertin, se tiennent depuis 1896 (Athènes). Les Jeux d'été et d'hiver ont lieu tous les quatre ans, en alternance tous les deux ans.",
            "Paris a accueilli les Jeux en 1900, 1924 et 2024. Les cinq anneaux entrelacés symbolisent l'union des continents.",
        ],
        facts: [
            ["Fondateur", "Pierre de Coubertin"],
            ["Premiers Jeux modernes", "Athènes, 1896"],
            ["Paris", "1900, 1924, 2024"],
            ["Devise", "Plus vite, plus haut, plus fort — ensemble"],
        ],
        url: "https://fr.wikipedia.org/wiki/Jeux_olympiques",
    },
};
