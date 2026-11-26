import {GiLaurelsTrophy} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const oscars: QuizzTopic = {
    id: "oscars",
    name: "Oscars",
    description: "Les grands gagnants de la cérémonie d'Hollywood",
    category: "cinema",
    icon: GiLaurelsTrophy,
    color: "#d4a017",
    wiki: {
        summary: [
            "Les Oscars du cinéma sont des récompenses décernées chaque année depuis 1929 par l'Académie des arts et sciences du cinéma, à Los Angeles. La statuette dorée représente un chevalier tenant une épée, debout sur une bobine de film.",
            "Le plus prestigieux est l'Oscar du meilleur film. Ben-Hur, Titanic et Le Seigneur des Anneaux : Le Retour du roi détiennent le record de onze statuettes.",
        ],
        facts: [
            ["Première cérémonie", "16 mai 1929"],
            ["Lieu actuel", "Dolby Theatre, Los Angeles"],
            ["Record", "11 Oscars (Ben-Hur, Titanic, Le Retour du roi)"],
            ["Organisateur", "Academy of Motion Picture Arts and Sciences"],
        ],
        url: "https://fr.wikipedia.org/wiki/Oscars_du_cinéma",
    },
};
