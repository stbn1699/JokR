import {GiRaceCar} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const cars: QuizzTopic = {
    id: "cars",
    name: "Cars",
    description: "Le premier film : Flash McQueen sur la route 66",
    category: "cinema",
    icon: GiRaceCar,
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
    questions: [
        {question: "Quel numéro porte Flash McQueen ?", answers: ["95", "43", "86", "51"]},
        {question: "Dans quelle petite ville Flash se retrouve-t-il coincé ?", answers: ["Radiator Springs", "Copper Canyon", "Sand Valley", "Petrol City"]},
        {question: "Sur quelle route se trouve Radiator Springs ?", answers: ["La route 66", "La route 1", "La route 99", "La route 101"]},
        {question: "Sous quel nom Doc Hudson était-il champion ?", answers: ["Le Fabuleux Hudson Hornet", "Le King", "L'Éclair de Detroit", "Le Bolide bleu"]},
        {question: "Quel genre de véhicule est Martin ?", answers: ["Une dépanneuse", "Un tracteur", "Un camion de pompiers", "Une camionnette"]},
        {question: "Quel rival de Flash porte le numéro 86 ?", answers: ["Chick Hicks", "Le King", "Francesco Bernoulli", "Jackson Storm"]},
        {question: "Que tient Sally à Radiator Springs ?", answers: ["Un motel", "Un garage", "Une boutique de pneus", "Un café"]},
        {question: "Quelle marque sponsorise Flash au début du film ?", answers: ["Rust-eze", "Dinoco", "Leak Less", "Octane Gain"]},
        {question: "Quelle course décide du champion à la fin du film ?", answers: ["La Piston Cup", "Le Grand Prix mondial", "La Coupe Dinoco", "La Florida 500"]},
        {question: "Que fait Flash juste avant la ligne d'arrivée de la dernière course ?", answers: ["Il s'arrête pour aider le King", "Il tombe en panne d'essence", "Il crève un pneu", "Il double Chick Hicks"]},
    ],
};
