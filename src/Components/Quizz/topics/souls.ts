import {GiCampfire} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const souls: QuizzTopic = {
    id: "souls",
    name: "Dark Souls et Elden Ring",
    description: "Feux de camp, boss impitoyables et « Vous êtes mort »",
    category: "jeux-video",
    icon: GiCampfire,
    color: "#ea580c",
    wiki: {
        summary: [
            "Les « Souls » sont des jeux de rôle d'action réputés pour leur difficulté, développés par le studio japonais FromSoftware sous la direction de Hidetaka Miyazaki : Demon's Souls (2009), la trilogie Dark Souls, Bloodborne, Sekiro et Elden Ring.",
            "Elden Ring (2022), écrit avec George R. R. Martin, a été élu jeu de l'année et s'est vendu à plus de 25 millions d'exemplaires. Son extension Shadow of the Erdtree est sortie en 2024.",
        ],
        facts: [
            ["Studio", "FromSoftware"],
            ["Directeur", "Hidetaka Miyazaki"],
            ["Premier jeu", "Demon's Souls (2009)"],
            ["Elden Ring", "2022, avec George R. R. Martin"],
        ],
        url: "https://fr.wikipedia.org/wiki/Elden_Ring",
    },
};
