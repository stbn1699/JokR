import {GiRoundTable} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const kaamelott: QuizzTopic = {
    id: "kaamelott",
    name: "Kaamelott",
    description: "Arthur, ses chevaliers pas très doués et le Graal",
    category: "series",
    icon: GiRoundTable,
    color: "#a16207",
    wiki: {
        summary: [
            "Kaamelott est une série télévisée française créée par Alexandre Astier, diffusée sur M6 de 2005 à 2009. Elle revisite la légende arthurienne sur le ton de la comédie : le roi Arthur tente de mener la quête du Graal entouré de chevaliers incompétents.",
            "D'abord composée de pastilles courtes, la série devient de plus en plus sombre au fil des six livres. Un film, Kaamelott : Premier Volet, sort en 2021.",
        ],
        facts: [
            ["Créateur", "Alexandre Astier"],
            ["Chaîne", "M6"],
            ["Diffusion", "2005 – 2009"],
            ["Saisons", "6 livres"],
        ],
        url: "https://fr.wikipedia.org/wiki/Kaamelott",
    },
};
