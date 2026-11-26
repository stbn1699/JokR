import {GiElephant} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const animaux: QuizzTopic = {
    id: "animaux",
    name: "Animaux",
    description: "Records, curiosités et petits noms du règne animal",
    category: "culture",
    icon: GiElephant,
    color: "#15803d",
    wiki: {
        summary: [
            "Le règne animal compte plus d'un million d'espèces décrites, des minuscules insectes à la baleine bleue, le plus grand animal ayant jamais existé.",
            "Les animaux sont classés en grands groupes : mammifères, oiseaux, reptiles, amphibiens, poissons, insectes, mollusques… Beaucoup sont aujourd'hui menacés d'extinction.",
        ],
        facts: [
            ["Plus grand animal", "La baleine bleue"],
            ["Animal terrestre le plus rapide", "Le guépard"],
            ["Plus grand animal terrestre", "L'éléphant d'Afrique"],
            ["Espèces décrites", "Plus d'un million"],
        ],
        url: "https://fr.wikipedia.org/wiki/Animal",
    },
};
