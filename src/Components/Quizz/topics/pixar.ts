import {GiDeskLamp} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const pixar: QuizzTopic = {
    id: "pixar",
    name: "Pixar",
    description: "Toy Story, Le Monde de Nemo, Vice-versa et toute la bande",
    category: "cinema",
    icon: GiDeskLamp,
    color: "#2563eb",
    wiki: {
        summary: [
            "Pixar Animation Studios est un studio d'animation américain, pionnier des images de synthèse. Toy Story, sorti en 1995, est le premier long métrage entièrement réalisé en images de synthèse.",
            "Racheté par Disney en 2006, le studio enchaîne les succès : Le Monde de Nemo, Les Indestructibles, Ratatouille, WALL-E, Là-haut, Coco ou Vice-versa. Sa mascotte est Luxo Jr., une petite lampe de bureau.",
        ],
        facts: [
            ["Fondation", "1986"],
            ["Siège", "Emeryville, Californie"],
            ["Premier long métrage", "Toy Story (1995)"],
            ["Propriétaire", "Disney (depuis 2006)"],
        ],
        url: "https://fr.wikipedia.org/wiki/Pixar_Animation_Studios",
    },
};
