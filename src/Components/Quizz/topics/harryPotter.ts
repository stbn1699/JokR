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
    questions: [
        {question: "Dans quelle maison de Poudlard Harry est-il envoyé ?", answers: ["Gryffondor", "Serpentard", "Poufsouffle", "Serdaigle"]},
        {question: "Comment s'appelle la chouette de Harry ?", answers: ["Hedwige", "Coquecigrue", "Errol", "Hermès"]},
        {question: "Quelle forme prend le Patronus de Harry ?", answers: ["Un cerf", "Une loutre", "Un phénix", "Un loup"]},
        {question: "De quelle voie part le Poudlard Express, à King's Cross ?", answers: ["La voie 9 ¾", "La voie 7 ½", "La voie 10 ¼", "La voie 9 ½"]},
        {question: "Qui se cache derrière le « Prince de Sang-Mêlé » ?", answers: ["Severus Rogue", "Tom Jedusor", "Albus Dumbledore", "Sirius Black"]},
        {question: "À quel poste Harry joue-t-il dans l'équipe de Quidditch ?", answers: ["Attrapeur", "Gardien", "Poursuiveur", "Batteur"]},
        {question: "Quel est le vrai nom de Voldemort ?", answers: ["Tom Elvis Jedusor", "Gellert Grindelwald", "Bartemius Croupton", "Peter Pettigrow"]},
        {question: "Quel sortilège fait sauter la baguette des mains de l'adversaire ?", answers: ["Expelliarmus", "Stupéfix", "Wingardium Leviosa", "Lumos"]},
        {question: "Comment s'appelle l'elfe de maison que Harry libère avec une chaussette ?", answers: ["Dobby", "Kreattur", "Winky", "Hokey"]},
        {question: "Quelle balle faut-il attraper pour finir un match de Quidditch ?", answers: ["Le Vif d'or", "Le Souafle", "Le Cognard", "La Bombabouse"]},
    ],
};
