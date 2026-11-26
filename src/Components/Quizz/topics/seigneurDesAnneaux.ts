import {GiRing} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const seigneurDesAnneaux: QuizzTopic = {
    id: "seigneur-des-anneaux",
    name: "Le Seigneur des Anneaux",
    description: "La Terre du Milieu au cinéma, de la Comté au Mordor",
    category: "cinema",
    icon: GiRing,
    color: "#ca8a04",
    wiki: {
        summary: [
            "Le Seigneur des Anneaux est une trilogie de films réalisée par Peter Jackson entre 2001 et 2003, d'après le roman de J. R. R. Tolkien. Le hobbit Frodon doit détruire l'Anneau unique dans les flammes de la Montagne du Destin, au cœur du Mordor de Sauron.",
            "Tournée en Nouvelle-Zélande, la trilogie remporte 17 Oscars, dont 11 pour Le Retour du roi. Peter Jackson adapte ensuite Le Hobbit en trois films.",
        ],
        facts: [
            ["Réalisateur", "Peter Jackson"],
            ["Films", "2001, 2002, 2003"],
            ["Oscars", "17 (dont 11 pour Le Retour du roi)"],
            ["Tournage", "Nouvelle-Zélande"],
        ],
        url: "https://fr.wikipedia.org/wiki/Le_Seigneur_des_anneaux_(série_de_films)",
    },
};
