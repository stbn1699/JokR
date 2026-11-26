import {GiCursedStar} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const jujutsuKaisen: QuizzTopic = {
    id: "jujutsu-kaisen",
    name: "Jujutsu Kaisen",
    description: "Yuji Itadori, Gojo et les fléaux",
    category: "anime",
    icon: GiCursedStar,
    color: "#4f46e5",
    wiki: {
        summary: [
            "Jujutsu Kaisen est un manga de Gege Akutami publié de 2018 à 2024. Le lycéen Yuji Itadori avale le doigt de Ryomen Sukuna, le roi des fléaux, et devient son réceptacle.",
            "Condamné à mort, il obtient un sursis : rassembler tous les doigts de Sukuna. Il rejoint l'école d'exorcisme de Tokyo sous l'aile de Satoru Gojo. L'anime est réalisé par le studio MAPPA.",
        ],
        facts: [
            ["Auteur", "Gege Akutami"],
            ["Publication", "2018 – 2024"],
            ["Anime", "MAPPA"],
            ["Héros", "Yuji Itadori"],
        ],
        url: "https://fr.wikipedia.org/wiki/Jujutsu_Kaisen",
    },
};
