import {GiMoneyStack} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const casaDePapel: QuizzTopic = {
    id: "casa-de-papel",
    name: "La Casa de Papel",
    description: "Le Professeur, ses braqueurs aux noms de villes et le masque de Dalí",
    category: "series",
    icon: GiMoneyStack,
    color: "#b91c1c",
    wiki: {
        summary: [
            "La Casa de Papel est une série télévisée espagnole créée par Álex Pina, diffusée d'abord sur Antena 3 en 2017 puis sur Netflix jusqu'en 2021. Un mystérieux Professeur réunit huit braqueurs pour attaquer la Fabrique nationale de la monnaie et du timbre, à Madrid.",
            "Vêtus de combinaisons rouges et de masques de Dalí, les braqueurs portent des noms de villes. La série est devenue la série non anglophone la plus regardée de Netflix.",
        ],
        facts: [
            ["Créateur", "Álex Pina"],
            ["Pays", "Espagne"],
            ["Diffusion", "2017 – 2021"],
            ["Chanson", "Bella ciao"],
        ],
        url: "https://fr.wikipedia.org/wiki/La_casa_de_papel",
    },
};
