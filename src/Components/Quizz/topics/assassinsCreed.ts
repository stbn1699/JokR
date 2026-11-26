import {GiHoodedAssassin} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const assassinsCreed: QuizzTopic = {
    id: "assassins-creed",
    name: "Assassin's Creed",
    description: "Assassins contre Templiers à travers l'Histoire",
    category: "jeux-video",
    icon: GiHoodedAssassin,
    color: "#7f1d1d",
    wiki: {
        summary: [
            "Assassin's Creed est une série de jeux vidéo d'action-aventure développée par Ubisoft, lancée en 2007. Grâce à une machine, l'Animus, des personnages modernes revivent les souvenirs de leurs ancêtres Assassins.",
            "Chaque épisode explore une époque : les croisades, la Renaissance italienne, la Révolution française, l'Égypte antique, les Vikings ou le Japon féodal. Les Assassins y combattent l'ordre des Templiers.",
        ],
        facts: [
            ["Éditeur", "Ubisoft"],
            ["Premier jeu", "Assassin's Creed (2007)"],
            ["Studio principal", "Ubisoft Montréal"],
            ["Machine", "L'Animus"],
        ],
        url: "https://fr.wikipedia.org/wiki/Assassin's_Creed",
    },
};
