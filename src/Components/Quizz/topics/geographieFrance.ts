import {GiFrance} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const geographieFrance: QuizzTopic = {
    id: "geographie-france",
    name: "Géographie de France",
    description: "Départements, préfectures, régions, fleuves et montagnes",
    category: "culture",
    icon: GiFrance,
    color: "#1d4ed8",
    wiki: {
        summary: [
            "La France métropolitaine compte 13 régions et 96 départements, auxquels s'ajoutent 5 départements d'outre-mer. Chaque département a une préfecture et un numéro, utilisé autrefois sur les plaques d'immatriculation.",
            "Ses grands fleuves sont la Loire, la Seine, le Rhône et la Garonne ; son plus haut sommet est le mont Blanc (4 805 m), dans les Alpes.",
        ],
        facts: [
            ["Régions", "13 en métropole, 18 au total"],
            ["Départements", "101"],
            ["Plus long fleuve", "La Loire"],
            ["Questions", "en partie tirées de Wikidata (CC0)"],
        ],
        url: "https://fr.wikipedia.org/wiki/Géographie_de_la_France",
    },
};
