import {FaJedi} from "react-icons/fa";
import type {QuizzTopic} from "./types.ts";

export const starWars: QuizzTopic = {
    id: "star-wars",
    name: "Star Wars",
    description: "Une galaxie lointaine, très lointaine…",
    category: "cinema",
    icon: FaJedi,
    color: "#facc15",
    wiki: {
        summary: [
            "Star Wars est une saga de science-fiction imaginée par George Lucas. Tout commence en 1977 avec le film Un nouvel espoir, qui raconte comment Luke Skywalker, un jeune fermier de Tatooine, rejoint la rébellion contre l'Empire galactique.",
            "La saga principale suit la famille Skywalker sur trois trilogies : la chute d'Anakin, qui devient Dark Vador, la victoire de son fils Luke, puis le combat de Rey contre le Premier Ordre. Au centre de tout : la Force, que se disputent les chevaliers Jedi et les Sith.",
            "Rachetée par Disney en 2012 avec Lucasfilm, la franchise s'est étendue en séries (The Mandalorian, Andor…), dessins animés, romans et jeux vidéo.",
        ],
        facts: [
            ["Créateur", "George Lucas"],
            ["Premier film", "Un nouvel espoir (1977)"],
            ["Saga Skywalker", "9 films, de 1977 à 2019"],
            ["Studio", "Lucasfilm (Disney depuis 2012)"],
            ["Musique", "John Williams"],
        ],
        url: "https://fr.wikipedia.org/wiki/Star_Wars",
    },
    questions: [
        {question: "Qui est le père de Luke Skywalker ?", answers: ["Dark Vador", "Obi-Wan Kenobi", "L'empereur Palpatine", "Owen Lars"]},
        {question: "Comment s'appelle le vaisseau de Han Solo ?", answers: ["Le Faucon Millenium", "Le Slave I", "L'Executor", "Le Ghost"]},
        {question: "Sur quelle planète Luke a-t-il grandi ?", answers: ["Tatooine", "Naboo", "Hoth", "Endor"]},
        {question: "Qui entraîne Luke sur Dagobah ?", answers: ["Yoda", "Qui-Gon Jinn", "Mace Windu", "Ahsoka Tano"]},
        {question: "À quelle espèce appartient Chewbacca ?", answers: ["Wookiee", "Ewok", "Hutt", "Twi'lek"]},
        {question: "En quelle année le premier film Star Wars est-il sorti au cinéma ?", answers: ["1977", "1980", "1975", "1983"]},
        {question: "De quelle couleur est le sabre laser de Mace Windu ?", answers: ["Violet", "Vert", "Bleu", "Rouge"]},
        {question: "Comment s'appelle la princesse d'Alderaan, sœur jumelle de Luke ?", answers: ["Leia Organa", "Padmé Amidala", "Mon Mothma", "Jyn Erso"]},
        {question: "Quel chasseur de primes livre Han Solo, figé dans la carbonite, à Jabba ?", answers: ["Boba Fett", "Bossk", "IG-88", "Greedo"]},
        {question: "Quel ordre pousse les clones à se retourner contre les Jedi ?", answers: ["L'ordre 66", "L'ordre 99", "L'ordre 77", "L'ordre 33"]},
        // questions en image (dessins dans public/quizz/star-wars)
        {question: "Quelle est cette planète ?", image: "/quizz/star-wars/tatooine.svg", answers: ["Tatooine", "Jakku", "Géonosis", "Mustafar"]},
        {question: "Quelle est cette planète ?", image: "/quizz/star-wars/hoth.svg", answers: ["Hoth", "Crait", "Ilum", "Kamino"]},
        {question: "Quelle est cette planète ?", image: "/quizz/star-wars/mustafar.svg", answers: ["Mustafar", "Tatooine", "Korriban", "Jakku"]},
        {question: "Quelle est cette lune ?", image: "/quizz/star-wars/endor.svg", answers: ["La lune forestière d'Endor", "Dagobah", "Kashyyyk", "Yavin 4"]},
        {question: "Quelle est cette planète ?", image: "/quizz/star-wars/coruscant.svg", answers: ["Coruscant", "Naboo", "Bespin", "Alderaan"]},
        {question: "Comment s'appelle cette station spatiale ?", image: "/quizz/star-wars/etoile-de-la-mort.svg", answers: ["L'Étoile de la Mort", "La base Starkiller", "Le Supremacy", "La station Jedha"]},
    ],
};
