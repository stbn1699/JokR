import {GiTestTubes} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const chimie: QuizzTopic = {
    id: "chimie",
    name: "Chimie",
    description: "Le tableau périodique, ses symboles et ses numéros",
    category: "culture",
    icon: GiTestTubes,
    color: "#7c3aed",
    wiki: {
        summary: [
            "La chimie étudie la matière, sa composition et ses transformations. Les 118 éléments chimiques connus sont rangés dans le tableau périodique, inventé par Dmitri Mendeleïev en 1869, selon leur numéro atomique (le nombre de protons du noyau).",
            "Chaque élément a un symbole d'une ou deux lettres, souvent tiré de son nom latin : Fe pour le fer (ferrum), Au pour l'or (aurum), Na pour le sodium (natrium).",
        ],
        facts: [
            ["Éléments connus", "118"],
            ["Tableau périodique", "Dmitri Mendeleïev (1869)"],
            ["Élément le plus léger", "L'hydrogène"],
            ["Questions", "en partie tirées de Wikidata (CC0)"],
        ],
        url: "https://fr.wikipedia.org/wiki/Tableau_périodique_des_éléments",
    },
};
