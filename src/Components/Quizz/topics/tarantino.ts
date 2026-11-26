import {GiCrossedPistols} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const tarantino: QuizzTopic = {
    id: "tarantino",
    name: "Tarantino",
    description: "Pulp Fiction, Kill Bill et les dialogues qui claquent",
    category: "cinema",
    icon: GiCrossedPistols,
    color: "#b45309",
    wiki: {
        summary: [
            "Quentin Tarantino est un réalisateur et scénariste américain né en 1963. Ancien employé de vidéoclub, il se fait connaître avec Reservoir Dogs (1992) puis remporte la Palme d'or avec Pulp Fiction (1994).",
            "Son cinéma mêle dialogues interminables, violence stylisée, chapitres et références à la culture populaire. Il a annoncé qu'il arrêterait après son dixième film.",
        ],
        facts: [
            ["Naissance", "27 mars 1963, Knoxville"],
            ["Palme d'or", "Pulp Fiction (1994)"],
            ["Oscars", "2, du meilleur scénario original"],
            ["Acteur fétiche", "Samuel L. Jackson"],
        ],
        url: "https://fr.wikipedia.org/wiki/Quentin_Tarantino",
    },
};
