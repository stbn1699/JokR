import {GiCycling} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const tourDeFrance: QuizzTopic = {
    id: "tour-de-france",
    name: "Tour de France",
    description: "Maillot jaune, cols mythiques et légendes du vélo",
    category: "sport",
    icon: GiCycling,
    color: "#eab308",
    wiki: {
        summary: [
            "Le Tour de France est une course cycliste par étapes créée en 1903 par le journal L'Auto. Il se déroule chaque année en juillet sur environ trois semaines et se termine traditionnellement sur les Champs-Élysées à Paris.",
            "Le leader du classement général porte le maillot jaune. Jacques Anquetil, Eddy Merckx, Bernard Hinault et Miguel Indurain l'ont gagné cinq fois.",
        ],
        facts: [
            ["Création", "1903"],
            ["Créateur", "Henri Desgrange (journal L'Auto)"],
            ["Record de victoires", "5 (Anquetil, Merckx, Hinault, Indurain)"],
            ["Maillot du leader", "Jaune"],
        ],
        url: "https://fr.wikipedia.org/wiki/Tour_de_France",
    },
};
