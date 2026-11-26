import {GiGreatPyramid} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const monuments: QuizzTopic = {
    id: "monuments",
    name: "Monuments du monde",
    description: "Merveilles, tours, temples et palais",
    category: "culture",
    icon: GiGreatPyramid,
    color: "#b45309",
    wiki: {
        summary: [
            "Les grands monuments témoignent du génie des civilisations : pyramides d'Égypte, Grande Muraille de Chine, Colisée de Rome, Taj Mahal ou tour Eiffel.",
            "La pyramide de Khéops est la seule des Sept Merveilles du monde antique encore debout. En 2007, un vote mondial a désigné les « sept nouvelles merveilles du monde ».",
        ],
        facts: [
            ["Seule merveille antique debout", "La pyramide de Khéops"],
            ["Monument payant le plus visité", "La tour Eiffel"],
            ["Liste", "Patrimoine mondial de l'UNESCO"],
            ["Nouvelles merveilles", "Élues en 2007"],
        ],
        url: "https://fr.wikipedia.org/wiki/Sept_nouvelles_merveilles_du_monde",
    },
};
