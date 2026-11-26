import {GiPalette} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const peinture: QuizzTopic = {
    id: "peinture",
    name: "Peinture",
    description: "Chefs-d'œuvre, peintres et grands musées",
    category: "culture",
    icon: GiPalette,
    color: "#c2410c",
    wiki: {
        summary: [
            "La peinture est l'un des plus anciens arts visuels, des grottes préhistoriques aux musées d'aujourd'hui. De la Renaissance italienne (Léonard de Vinci, Raphaël, Michel-Ange) à l'impressionnisme (Monet, Renoir) et à l'art moderne (Picasso, Van Gogh, Dalí), elle a connu de nombreux mouvements.",
            "Les grands musées comme le Louvre, le Prado, les Offices ou le Metropolitan Museum conservent les chefs-d'œuvre les plus célèbres.",
        ],
        facts: [
            ["Tableau le plus célèbre", "La Joconde (Louvre)"],
            ["Musée le plus visité", "Le Louvre"],
            ["Mouvement né en France", "L'impressionnisme"],
            ["Questions", "en partie tirées de Wikidata (CC0)"],
        ],
        url: "https://fr.wikipedia.org/wiki/Peinture",
    },
};
