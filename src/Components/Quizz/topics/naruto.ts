import {GiNinjaHead} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const naruto: QuizzTopic = {
    id: "naruto",
    name: "Naruto",
    description: "Le ninja de Konoha qui rêve de devenir Hokage",
    category: "anime",
    icon: GiNinjaHead,
    color: "#f97316",
    wiki: {
        summary: [
            "Naruto est un manga de Masashi Kishimoto publié de 1999 à 2014 dans le Weekly Shōnen Jump. Naruto Uzumaki, jeune ninja du village de Konoha rejeté parce qu'il abrite le démon renard à neuf queues, rêve de devenir Hokage, le chef du village.",
            "La série se poursuit avec Naruto Shippuden puis Boruto, qui suit le fils de Naruto.",
        ],
        facts: [
            ["Auteur", "Masashi Kishimoto"],
            ["Publication", "1999 – 2014"],
            ["Village", "Konoha"],
            ["Suites", "Naruto Shippuden, Boruto"],
        ],
        url: "https://fr.wikipedia.org/wiki/Naruto",
    },
};
