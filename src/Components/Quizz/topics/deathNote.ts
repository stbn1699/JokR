import {GiNotebook} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const deathNote: QuizzTopic = {
    id: "death-note",
    name: "Death Note",
    description: "Light, L et le carnet qui tue",
    category: "anime",
    icon: GiNotebook,
    color: "#18181b",
    wiki: {
        summary: [
            "Death Note est un manga écrit par Tsugumi Ōba et dessiné par Takeshi Obata, publié de 2003 à 2006. Le lycéen Light Yagami trouve un carnet tombé du monde des dieux de la mort : toute personne dont le nom y est écrit meurt.",
            "Sous le nom de Kira, il décide d'éliminer les criminels pour créer un monde idéal, poursuivi par le mystérieux détective L. L'anime de Madhouse (2006) est devenu un classique.",
        ],
        facts: [
            ["Scénario", "Tsugumi Ōba"],
            ["Dessin", "Takeshi Obata"],
            ["Publication", "2003 – 2006"],
            ["Anime", "Madhouse (2006-2007)"],
        ],
        url: "https://fr.wikipedia.org/wiki/Death_Note",
    },
};
