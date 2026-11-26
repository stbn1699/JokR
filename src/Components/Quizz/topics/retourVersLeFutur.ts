import {GiTimeTrap} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const retourVersLeFutur: QuizzTopic = {
    id: "retour-vers-le-futur",
    name: "Retour vers le futur",
    description: "Marty, Doc et la DeLorean à 88 miles à l'heure",
    category: "cinema",
    icon: GiTimeTrap,
    color: "#ea580c",
    wiki: {
        summary: [
            "Retour vers le futur est une trilogie de films réalisée par Robert Zemeckis et produite par Steven Spielberg, sortie entre 1985 et 1990. Le lycéen Marty McFly voyage dans le temps grâce à une DeLorean transformée par son ami, le savant Emmett « Doc » Brown.",
            "Le premier film l'envoie en 1955, où il empêche sans le vouloir la rencontre de ses parents. Les suites l'emmènent en 2015 puis au Far West en 1885.",
        ],
        facts: [
            ["Réalisateur", "Robert Zemeckis"],
            ["Films", "1985, 1989, 1990"],
            ["Acteurs", "Michael J. Fox, Christopher Lloyd"],
            ["Machine", "DeLorean DMC-12"],
        ],
        url: "https://fr.wikipedia.org/wiki/Retour_vers_le_futur",
    },
};
