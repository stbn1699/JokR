import {GiRingedPlanet} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const espace: QuizzTopic = {
    id: "espace",
    name: "Espace",
    description: "Planètes, étoiles et conquête spatiale",
    category: "culture",
    icon: GiRingedPlanet,
    color: "#312e81",
    wiki: {
        summary: [
            "Le Système solaire compte huit planètes qui tournent autour du Soleil : Mercure, Vénus, la Terre, Mars, Jupiter, Saturne, Uranus et Neptune. Pluton a été reclassée planète naine en 2006.",
            "La conquête spatiale commence avec le satellite soviétique Spoutnik en 1957, puis Youri Gagarine, premier homme dans l'espace en 1961, et Neil Armstrong, premier homme sur la Lune en 1969.",
        ],
        facts: [
            ["Planètes", "8"],
            ["Plus grande planète", "Jupiter"],
            ["Premier homme dans l'espace", "Youri Gagarine (1961)"],
            ["Premier pas sur la Lune", "Neil Armstrong (1969)"],
        ],
        url: "https://fr.wikipedia.org/wiki/Système_solaire",
    },
};
