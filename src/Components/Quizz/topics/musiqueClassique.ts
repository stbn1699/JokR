import {GiViolin} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const musiqueClassique: QuizzTopic = {
    id: "musique-classique",
    name: "Musique classique",
    description: "Bach, Mozart, Beethoven et les grands compositeurs",
    category: "musique",
    icon: GiViolin,
    color: "#92400e",
    wiki: {
        summary: [
            "La musique classique désigne la tradition de musique savante occidentale, du Moyen Âge à nos jours. On distingue notamment les périodes baroque (Bach, Vivaldi), classique (Haydn, Mozart), romantique (Beethoven, Chopin, Wagner) et moderne (Debussy, Stravinsky).",
            "Symphonies, concertos, opéras et sonates sont joués par des orchestres et des solistes du monde entier.",
        ],
        facts: [
            ["Périodes", "Baroque, classique, romantique, moderne"],
            ["Formes", "Symphonie, concerto, opéra, sonate"],
            ["Grand orchestre", "Une centaine de musiciens"],
            ["Ville de la musique", "Vienne"],
        ],
        url: "https://fr.wikipedia.org/wiki/Musique_classique",
    },
};
