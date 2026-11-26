import {GiPaperClip} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const theOffice: QuizzTopic = {
    id: "the-office",
    name: "The Office",
    description: "Dunder Mifflin, Scranton, et Michael Scott",
    category: "series",
    icon: GiPaperClip,
    color: "#0f766e",
    wiki: {
        summary: [
            "The Office est une sitcom américaine diffusée sur NBC de 2005 à 2013, adaptée de la série britannique de Ricky Gervais. Tournée en faux documentaire, elle suit les employés de l'agence de Scranton de l'entreprise de papeterie Dunder Mifflin.",
            "Le patron Michael Scott, gaffeur et attachant, l'impayable Dwight Schrute et la romance de Jim et Pam en ont fait une série culte.",
        ],
        facts: [
            ["Chaîne", "NBC"],
            ["Diffusion", "2005 – 2013"],
            ["Saisons", "9 (201 épisodes)"],
            ["Lieu", "Scranton, Pennsylvanie"],
        ],
        url: "https://fr.wikipedia.org/wiki/The_Office_(série_télévisée,_2005)",
    },
};
