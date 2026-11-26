import {GiLightBulb} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const inventions: QuizzTopic = {
    id: "inventions",
    name: "Inventions",
    description: "Inventeurs et inventions qui ont changé le monde",
    category: "culture",
    icon: GiLightBulb,
    color: "#ca8a04",
    wiki: {
        summary: [
            "Les grandes inventions ont transformé la vie des humains : l'imprimerie de Gutenberg, la machine à vapeur, l'électricité, le téléphone, l'automobile, l'avion, l'ordinateur et Internet.",
            "La France compte de nombreux inventeurs célèbres : les frères Lumière (cinéma), Louis Braille (écriture pour aveugles), Nicéphore Niépce (photographie) ou les frères Montgolfier (montgolfière).",
        ],
        facts: [
            ["Imprimerie", "Gutenberg (vers 1450)"],
            ["Téléphone", "Graham Bell (1876)"],
            ["Cinéma", "Frères Lumière (1895)"],
            ["Web", "Tim Berners-Lee (1989)"],
        ],
        url: "https://fr.wikipedia.org/wiki/Invention",
    },
};
