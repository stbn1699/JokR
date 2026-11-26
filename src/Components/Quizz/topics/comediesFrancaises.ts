import {GiTheaterCurtains} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const comediesFrancaises: QuizzTopic = {
    id: "comedies-francaises",
    name: "Comédies françaises",
    description: "Les Visiteurs, OSS 117, Le Dîner de cons et autres films cultes",
    category: "cinema",
    icon: GiTheaterCurtains,
    color: "#1d4ed8",
    wiki: {
        summary: [
            "La comédie est le genre le plus populaire du cinéma français. De La Grande Vadrouille (1966) à Bienvenue chez les Ch'tis (2008) et Intouchables (2011), les plus grands succès du box-office français sont des comédies.",
            "Louis de Funès, Bourvil, Coluche, la troupe du Splendid, Jean Dujardin ou Omar Sy ont marqué plusieurs générations avec des répliques passées dans le langage courant.",
        ],
        facts: [
            ["Record historique", "Bienvenue chez les Ch'tis (plus de 20 millions d'entrées)"],
            ["Icône", "Louis de Funès"],
            ["Troupe culte", "Le Splendid"],
            ["Récompense", "César du meilleur film"],
        ],
        url: "https://fr.wikipedia.org/wiki/Comédie_française_(cinéma)",
    },
};
