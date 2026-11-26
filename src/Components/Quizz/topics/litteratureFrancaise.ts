import {GiQuill} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const litteratureFrancaise: QuizzTopic = {
    id: "litterature-francaise",
    name: "Littérature française",
    description: "De Molière à Camus, les grands auteurs et leurs œuvres",
    category: "livres",
    icon: GiQuill,
    color: "#1e40af",
    wiki: {
        summary: [
            "La littérature française rassemble les œuvres écrites en français, du Moyen Âge à nos jours. Elle compte des monuments comme les pièces de Molière, Racine et Corneille, les romans de Victor Hugo, Balzac, Flaubert et Zola, ou les poèmes de Baudelaire, Rimbaud et Verlaine.",
            "Au XXe siècle, Proust, Camus, Sartre, Duras ou Modiano ont marqué le monde des lettres. La France est le pays qui compte le plus de lauréats du prix Nobel de littérature.",
        ],
        facts: [
            ["Prix majeur", "Prix Goncourt (depuis 1903)"],
            ["Institution", "Académie française (1635)"],
            ["Prix Nobel", "16 lauréats français"],
            ["Questions", "en partie tirées de Wikidata (CC0)"],
        ],
        url: "https://fr.wikipedia.org/wiki/Littérature_française",
    },
};
