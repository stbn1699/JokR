import {GiKatana} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const demonSlayer: QuizzTopic = {
    id: "demon-slayer",
    name: "Demon Slayer",
    description: "Tanjiro, Nezuko et les pourfendeurs de démons",
    category: "anime",
    icon: GiKatana,
    color: "#0f766e",
    wiki: {
        summary: [
            "Demon Slayer (Kimetsu no Yaiba) est un manga de Koyoharu Gotōge publié de 2016 à 2020. Au Japon de l'ère Taishō, Tanjiro Kamado voit sa famille massacrée par un démon et sa sœur Nezuko transformée en démon.",
            "Il rejoint les pourfendeurs de démons pour la soigner et vaincre Muzan Kibutsuji. L'anime du studio Ufotable est réputé pour son animation spectaculaire.",
        ],
        facts: [
            ["Auteur", "Koyoharu Gotōge"],
            ["Publication", "2016 – 2020"],
            ["Anime", "Ufotable"],
            ["Époque", "Ère Taishō (début du XXe siècle)"],
        ],
        url: "https://fr.wikipedia.org/wiki/Demon_Slayer",
    },
};
