import {GiStarsStack} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const eurovision: QuizzTopic = {
    id: "eurovision",
    name: "Eurovision",
    description: "Le grand concours européen de la chanson",
    category: "musique",
    icon: GiStarsStack,
    color: "#db2777",
    wiki: {
        summary: [
            "Le Concours Eurovision de la chanson est un concours annuel organisé depuis 1956 par l'Union européenne de radio-télévision. Chaque pays participant présente une chanson inédite, et les votes des jurys et du public désignent le vainqueur.",
            "ABBA, Céline Dion, Måneskin ou Loreen y ont été révélés ou consacrés. Le pays vainqueur organise généralement l'édition suivante.",
        ],
        facts: [
            ["Première édition", "1956, Lugano (Suisse)"],
            ["Organisateur", "Union européenne de radio-télévision"],
            ["Records de victoires", "Irlande et Suède (7)"],
            ["Victoires françaises", "5"],
        ],
        url: "https://fr.wikipedia.org/wiki/Concours_Eurovision_de_la_chanson",
    },
};
