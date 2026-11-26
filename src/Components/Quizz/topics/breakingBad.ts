import {GiChemicalDrop} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const breakingBad: QuizzTopic = {
    id: "breaking-bad",
    name: "Breaking Bad",
    description: "Walter White, Jesse Pinkman et Albuquerque",
    category: "series",
    icon: GiChemicalDrop,
    color: "#15803d",
    wiki: {
        summary: [
            "Breaking Bad est une série télévisée américaine créée par Vince Gilligan, diffusée sur AMC de 2008 à 2013. Walter White, professeur de chimie atteint d'un cancer, se lance dans la fabrication de méthamphétamine avec son ancien élève Jesse Pinkman pour assurer l'avenir de sa famille.",
            "Sous le pseudonyme d'Heisenberg, il devient un baron de la drogue redouté. La série a donné naissance à Better Call Saul et au film El Camino.",
        ],
        facts: [
            ["Créateur", "Vince Gilligan"],
            ["Chaîne", "AMC"],
            ["Diffusion", "2008 – 2013"],
            ["Lieu", "Albuquerque, Nouveau-Mexique"],
        ],
        url: "https://fr.wikipedia.org/wiki/Breaking_Bad",
    },
};
