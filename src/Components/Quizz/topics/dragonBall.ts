import {GiFireball} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const dragonBall: QuizzTopic = {
    id: "dragon-ball",
    name: "Dragon Ball",
    description: "Son Goku, les boules de cristal et le Super Saiyan",
    category: "anime",
    icon: GiFireball,
    color: "#f59e0b",
    wiki: {
        summary: [
            "Dragon Ball est un manga d'Akira Toriyama publié de 1984 à 1995 dans le Weekly Shōnen Jump. Il suit Son Goku, un garçon à queue de singe doté d'une force incroyable, de sa quête des sept boules de cristal jusqu'aux combats contre les plus grands ennemis de l'univers.",
            "Adapté en animes (Dragon Ball, Dragon Ball Z, Dragon Ball Super), il a marqué des générations, notamment en France grâce au Club Dorothée.",
        ],
        facts: [
            ["Auteur", "Akira Toriyama"],
            ["Publication", "1984 – 1995"],
            ["Héros", "Son Goku"],
            ["Suites", "Dragon Ball Z, GT, Super, Daima"],
        ],
        url: "https://fr.wikipedia.org/wiki/Dragon_Ball",
    },
};
