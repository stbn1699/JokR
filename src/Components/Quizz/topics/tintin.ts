import {GiRocket} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const tintin: QuizzTopic = {
    id: "tintin",
    name: "Tintin",
    description: "Le reporter à la houppe, Milou et le capitaine Haddock",
    category: "livres",
    icon: GiRocket,
    color: "#0ea5e9",
    wiki: {
        summary: [
            "Les Aventures de Tintin est une série de bande dessinée créée par le Belge Hergé en 1929. Tintin, jeune reporter à la houppe, parcourt le monde avec son chien Milou pour résoudre des mystères.",
            "Il est entouré du capitaine Haddock, du professeur Tournesol et des détectives Dupond et Dupont. Les 24 albums, dessinés en « ligne claire », ont été traduits dans plus de cent langues.",
        ],
        facts: [
            ["Créateur", "Hergé (Georges Remi)"],
            ["Première apparition", "1929"],
            ["Albums", "24 (dont un inachevé)"],
            ["Style", "La ligne claire"],
        ],
        url: "https://fr.wikipedia.org/wiki/Les_Aventures_de_Tintin",
    },
};
