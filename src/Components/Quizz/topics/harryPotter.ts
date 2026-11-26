import {FaHatWizard} from "react-icons/fa";
import type {QuizzTopic} from "./types.ts";

export const harryPotter: QuizzTopic = {
    id: "harry-potter",
    name: "Harry Potter",
    description: "Le monde des sorciers et Poudlard",
    category: "livres",
    icon: FaHatWizard,
    color: "#b91c1c",
    wiki: {
        summary: [
            "Harry Potter est une série de sept romans écrits par la Britannique J. K. Rowling, publiés de 1997 à 2007. Le premier tome, Harry Potter à l'école des sorciers, raconte comment un orphelin de 11 ans découvre qu'il est sorcier et entre à Poudlard.",
            "Au fil des années d'école, Harry, Ron et Hermione affrontent Lord Voldemort, le mage noir qui a tué les parents de Harry et cherche à revenir au pouvoir.",
            "Les livres ont été traduits dans plus de 80 langues (en français par Jean-François Ménard, chez Gallimard) et adaptés en huit films de 2001 à 2011, puis prolongés par la série Les Animaux fantastiques.",
        ],
        facts: [
            ["Autrice", "J. K. Rowling"],
            ["Romans", "7 tomes, de 1997 à 2007"],
            ["Films", "8 films, de 2001 à 2011"],
            ["Éditeur français", "Gallimard Jeunesse"],
            ["Traduction", "Jean-François Ménard"],
        ],
        url: "https://fr.wikipedia.org/wiki/Harry_Potter",
    },
};
