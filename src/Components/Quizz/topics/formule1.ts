import {GiF1Car} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const formule1: QuizzTopic = {
    id: "formule-1",
    name: "Formule 1",
    description: "Grands Prix, écuries et champions du monde",
    category: "sport",
    icon: GiF1Car,
    color: "#dc2626",
    wiki: {
        summary: [
            "La Formule 1 est la catégorie reine du sport automobile, dont le championnat du monde existe depuis 1950. Une vingtaine de pilotes répartis en une dizaine d'écuries disputent des Grands Prix sur des circuits du monde entier.",
            "Michael Schumacher et Lewis Hamilton détiennent le record de sept titres mondiaux. Ferrari est la plus ancienne et la plus titrée des écuries.",
        ],
        facts: [
            ["Premier championnat", "1950"],
            ["Records de titres", "Schumacher et Hamilton (7)"],
            ["Écurie la plus titrée", "Ferrari"],
            ["Champion français", "Alain Prost (4 titres)"],
        ],
        url: "https://fr.wikipedia.org/wiki/Formule_1",
    },
};
