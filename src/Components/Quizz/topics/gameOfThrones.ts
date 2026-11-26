import {GiDragonHead} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const gameOfThrones: QuizzTopic = {
    id: "game-of-thrones",
    name: "Game of Thrones",
    description: "Westeros, le Trône de fer et l'hiver qui vient",
    category: "series",
    icon: GiDragonHead,
    color: "#57534e",
    wiki: {
        summary: [
            "Game of Thrones est une série télévisée américaine diffusée sur HBO de 2011 à 2019, adaptée des romans Le Trône de fer de George R. R. Martin. Sur le continent de Westeros, les grandes maisons nobles se disputent le Trône de fer pendant qu'au-delà du Mur, les Marcheurs blancs se réveillent.",
            "En huit saisons et 73 épisodes, la série est devenue un phénomène mondial et a remporté un record de prix Emmy pour une série dramatique.",
        ],
        facts: [
            ["Chaîne", "HBO"],
            ["Diffusion", "2011 – 2019"],
            ["Saisons", "8 (73 épisodes)"],
            ["D'après", "Le Trône de fer, de George R. R. Martin"],
        ],
        url: "https://fr.wikipedia.org/wiki/Game_of_Thrones",
    },
};
