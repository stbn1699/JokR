import {GiRadioactive} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const the100: QuizzTopic = {
    id: "the-100",
    name: "The 100",
    description: "Cent jeunes délinquants renvoyés sur une Terre irradiée",
    category: "series",
    icon: GiRadioactive,
    color: "#65a30d",
    wiki: {
        summary: [
            "The 100 est une série télévisée américaine de science-fiction diffusée sur The CW de 2014 à 2020, adaptée des romans de Kass Morgan. Quatre-vingt-dix-sept ans après une apocalypse nucléaire, les survivants vivent dans une station spatiale, l'Arche.",
            "Faute d'oxygène, cent jeunes délinquants sont envoyés sur Terre pour vérifier si elle est habitable. Ils découvrent qu'elle est peuplée de clans de « natifs », les Terriens.",
        ],
        facts: [
            ["Chaîne", "The CW"],
            ["Diffusion", "2014 – 2020"],
            ["Saisons", "7 (100 épisodes)"],
            ["D'après", "les romans de Kass Morgan"],
        ],
        url: "https://fr.wikipedia.org/wiki/Les_100",
    },
};
