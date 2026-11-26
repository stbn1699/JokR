import {GiCoffeeCup} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const friends: QuizzTopic = {
    id: "friends",
    name: "Friends",
    description: "Six amis new-yorkais et le Central Perk",
    category: "series",
    icon: GiCoffeeCup,
    color: "#9333ea",
    wiki: {
        summary: [
            "Friends est une sitcom américaine créée par David Crane et Marta Kauffman, diffusée sur NBC de 1994 à 2004. Elle suit six amis new-yorkais : Rachel, Monica, Phoebe, Joey, Chandler et Ross, souvent réunis au café Central Perk.",
            "En dix saisons et 236 épisodes, la série est devenue l'une des plus populaires de l'histoire de la télévision.",
        ],
        facts: [
            ["Chaîne", "NBC"],
            ["Diffusion", "1994 – 2004"],
            ["Saisons", "10 (236 épisodes)"],
            ["Lieu culte", "Le Central Perk"],
        ],
        url: "https://fr.wikipedia.org/wiki/Friends",
    },
};
