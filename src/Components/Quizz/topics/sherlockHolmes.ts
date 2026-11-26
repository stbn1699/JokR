import {GiSmokingPipe} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const sherlockHolmes: QuizzTopic = {
    id: "sherlock-holmes",
    name: "Sherlock Holmes",
    description: "Le détective du 221B Baker Street et le docteur Watson",
    category: "livres",
    icon: GiSmokingPipe,
    color: "#78350f",
    wiki: {
        summary: [
            "Sherlock Holmes est un détective de fiction créé par l'écrivain écossais Arthur Conan Doyle en 1887, dans Une étude en rouge. Doté d'un sens de l'observation et de la déduction hors du commun, il résout des énigmes à Londres avec son ami, le docteur John Watson.",
            "Quatre romans et cinquante-six nouvelles composent les aventures originales. Holmes est l'un des personnages les plus adaptés au cinéma et à la télévision.",
        ],
        facts: [
            ["Créateur", "Arthur Conan Doyle"],
            ["Première apparition", "Une étude en rouge (1887)"],
            ["Adresse", "221B Baker Street, Londres"],
            ["Ennemi juré", "Le professeur Moriarty"],
        ],
        url: "https://fr.wikipedia.org/wiki/Sherlock_Holmes",
    },
};
