import {GiTank} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const secondeGuerreMondiale: QuizzTopic = {
    id: "seconde-guerre-mondiale",
    name: "Seconde Guerre mondiale",
    description: "1939-1945 : batailles, Résistance et Libération",
    category: "culture",
    icon: GiTank,
    color: "#3f6212",
    wiki: {
        summary: [
            "La Seconde Guerre mondiale (1939-1945) est le conflit le plus meurtrier de l'histoire, avec plus de 60 millions de morts. Elle oppose les Alliés (Royaume-Uni, URSS, États-Unis, France libre…) aux puissances de l'Axe (Allemagne nazie, Italie, Japon).",
            "La France, envahie en 1940, est occupée puis libérée après le débarquement du 6 juin 1944 en Normandie. La guerre se termine en Europe le 8 mai 1945 et dans le Pacifique en septembre 1945.",
        ],
        facts: [
            ["Dates", "1er septembre 1939 – 2 septembre 1945"],
            ["Débarquement", "6 juin 1944 (Normandie)"],
            ["Fin en Europe", "8 mai 1945"],
            ["Victimes", "Plus de 60 millions"],
        ],
        url: "https://fr.wikipedia.org/wiki/Seconde_Guerre_mondiale",
    },
};
