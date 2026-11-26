import {GiBloodyStash} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const filmsHorreur: QuizzTopic = {
    id: "films-horreur",
    name: "Films d'horreur",
    description: "Tueurs masqués, maisons hantées et monstres cultes",
    category: "cinema",
    icon: GiBloodyStash,
    color: "#991b1b",
    wiki: {
        summary: [
            "Le film d'horreur cherche à provoquer la peur chez le spectateur. Le genre naît avec le cinéma muet (Nosferatu, 1922) et se renouvelle à chaque génération : monstres d'Universal, slashers des années 1970-1980, found footage, horreur psychologique.",
            "Halloween, Vendredi 13, Les Griffes de la nuit, Scream ou Conjuring ont créé des figures inoubliables comme Michael Myers, Jason Voorhees, Freddy Krueger ou Ghostface.",
        ],
        facts: [
            ["Pionnier", "Nosferatu (1922)"],
            ["Sous-genres", "Slasher, épouvante, found footage, gore"],
            ["Maître du suspense", "Alfred Hitchcock"],
            ["Roi de l'horreur en littérature", "Stephen King"],
        ],
        url: "https://fr.wikipedia.org/wiki/Film_d'horreur",
    },
};
