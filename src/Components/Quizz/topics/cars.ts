import {Cars95Icon} from "./icons.tsx";
import type {QuizzTopic} from "./types.ts";

export const cars: QuizzTopic = {
    id: "cars",
    name: "Cars",
    description: "Le premier film : Flash McQueen sur la route 66",
    category: "cinema",
    icon: Cars95Icon,
    color: "#dc2626",
    wiki: {
        summary: [
            "Cars est un film d'animation des studios Pixar, réalisé par John Lasseter et sorti en 2006. Dans un monde peuplé de voitures, la jeune star de la course Flash McQueen ne pense qu'à gagner la Piston Cup.",
            "En route pour la dernière course de la saison, il se perd et atterrit à Radiator Springs, une petite ville oubliée de la route 66. Condamné à y réparer la route qu'il a abîmée, il s'y fait des amis : Martin la dépanneuse, Sally et le vieux juge Doc Hudson.",
            "Le film a donné naissance à deux suites, Cars 2 (2011) et Cars 3 (2017), et aux films dérivés Planes.",
        ],
        facts: [
            ["Studio", "Pixar"],
            ["Réalisation", "John Lasseter"],
            ["Sortie", "2006"],
            ["Voix de Flash (VF)", "Guillaume Canet"],
            ["Suites", "Cars 2 (2011), Cars 3 (2017)"],
        ],
        url: "https://fr.wikipedia.org/wiki/Cars_:_Quatre_Roues",
    },
};
