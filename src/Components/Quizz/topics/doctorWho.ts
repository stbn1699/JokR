import {GiSandsOfTime} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const doctorWho: QuizzTopic = {
    id: "doctor-who",
    name: "Doctor Who",
    description: "Le Docteur, son TARDIS et ses ennemis à travers l'espace et le temps",
    category: "series",
    icon: GiSandsOfTime,
    color: "#1e3a8a",
    wiki: {
        summary: [
            "Doctor Who est une série télévisée britannique de science-fiction diffusée par la BBC depuis 1963. Elle suit le Docteur, un extraterrestre Seigneur du Temps qui voyage dans l'espace et le temps à bord du TARDIS, un vaisseau qui ressemble à une cabine de police bleue.",
            "Quand il est mortellement blessé, le Docteur se régénère et change d'apparence : c'est ce qui permet à de nombreux acteurs de se succéder dans le rôle.",
        ],
        facts: [
            ["Chaîne", "BBC"],
            ["Première diffusion", "23 novembre 1963"],
            ["Vaisseau", "Le TARDIS"],
            ["Peuple du Docteur", "Les Seigneurs du Temps"],
        ],
        url: "https://fr.wikipedia.org/wiki/Doctor_Who",
    },
};
