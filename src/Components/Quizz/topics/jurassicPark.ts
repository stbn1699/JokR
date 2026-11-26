import {GiDinosaurRex} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const jurassicPark: QuizzTopic = {
    id: "jurassic-park",
    name: "Jurassic Park",
    description: "Isla Nublar, ses dinosaures et ce qui tourne mal",
    category: "cinema",
    icon: GiDinosaurRex,
    color: "#16a34a",
    wiki: {
        summary: [
            "Jurassic Park est un film de Steven Spielberg sorti en 1993, adapté du roman de Michael Crichton. Le milliardaire John Hammond a recréé des dinosaures grâce à de l'ADN conservé dans de l'ambre, pour en faire un parc d'attractions sur l'île d'Isla Nublar.",
            "Le film, révolutionnaire pour ses effets numériques, a donné naissance à une saga : Le Monde perdu, Jurassic Park III, puis la trilogie Jurassic World à partir de 2015.",
        ],
        facts: [
            ["Réalisateur", "Steven Spielberg"],
            ["Sortie", "1993"],
            ["D'après", "le roman de Michael Crichton (1990)"],
            ["Musique", "John Williams"],
        ],
        url: "https://fr.wikipedia.org/wiki/Jurassic_Park_(film)",
    },
};
