import {GiPentacle} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const fullmetalAlchemist: QuizzTopic = {
    id: "fullmetal-alchemist",
    name: "Fullmetal Alchemist",
    description: "Les frères Elric et la pierre philosophale",
    category: "anime",
    icon: GiPentacle,
    color: "#b91c1c",
    wiki: {
        summary: [
            "Fullmetal Alchemist est un manga de Hiromu Arakawa publié de 2001 à 2010. Les frères Edward et Alphonse Elric tentent de ressusciter leur mère par l'alchimie, mais l'expérience échoue : Edward perd une jambe et un bras, Alphonse tout son corps, son âme étant fixée dans une armure.",
            "Ils partent à la recherche de la pierre philosophale pour retrouver leurs corps. L'adaptation Fullmetal Alchemist: Brotherhood (2009) est souvent citée parmi les meilleurs animes de tous les temps.",
        ],
        facts: [
            ["Autrice", "Hiromu Arakawa"],
            ["Publication", "2001 – 2010"],
            ["Animes", "Fullmetal Alchemist (2003), Brotherhood (2009)"],
            ["Pays", "Amestris"],
        ],
        url: "https://fr.wikipedia.org/wiki/Fullmetal_Alchemist",
    },
};
