import {GiWingfoot} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const attaqueDesTitans: QuizzTopic = {
    id: "attaque-des-titans",
    name: "L'Attaque des Titans",
    description: "Eren, les murs et les Titans mangeurs d'hommes",
    category: "anime",
    icon: GiWingfoot,
    color: "#78716c",
    wiki: {
        summary: [
            "L'Attaque des Titans (Shingeki no Kyojin) est un manga de Hajime Isayama publié de 2009 à 2021. L'humanité survit derrière trois immenses murs pour se protéger des Titans, des géants qui dévorent les humains.",
            "Après la destruction de sa ville, Eren Jäger s'engage dans le Bataillon d'exploration avec Mikasa et Armin, et découvre peu à peu la terrible vérité sur l'origine des Titans.",
        ],
        facts: [
            ["Auteur", "Hajime Isayama"],
            ["Publication", "2009 – 2021"],
            ["Anime", "Wit Studio puis MAPPA"],
            ["Héros", "Eren Jäger"],
        ],
        url: "https://fr.wikipedia.org/wiki/L'Attaque_des_Titans",
    },
};
