import {GiDonut} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const simpson: QuizzTopic = {
    id: "simpson",
    name: "Les Simpson",
    description: "Homer, Marge, Bart, Lisa, Maggie et Springfield",
    category: "series",
    icon: GiDonut,
    color: "#facc15",
    wiki: {
        summary: [
            "Les Simpson est une série télévisée d'animation américaine créée par Matt Groening, diffusée depuis 1989 sur la chaîne Fox. Elle met en scène une famille de la classe moyenne vivant dans la ville fictive de Springfield : Homer, Marge et leurs enfants Bart, Lisa et Maggie.",
            "Avec plus de 35 saisons et 750 épisodes, c'est la plus longue série d'animation et la plus longue sitcom américaine de l'histoire.",
        ],
        facts: [
            ["Créateur", "Matt Groening"],
            ["Chaîne", "Fox"],
            ["Première diffusion", "17 décembre 1989"],
            ["Ville", "Springfield"],
        ],
        url: "https://fr.wikipedia.org/wiki/Les_Simpson",
    },
};
