import {GiMagnifyingGlass} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const agathaChristie: QuizzTopic = {
    id: "agatha-christie",
    name: "Agatha Christie",
    description: "Hercule Poirot, Miss Marple et les crimes en huis clos",
    category: "livres",
    icon: GiMagnifyingGlass,
    color: "#be185d",
    wiki: {
        summary: [
            "Agatha Christie (1890-1976) est une romancière britannique, autrice de 66 romans policiers et de nombreuses nouvelles. Surnommée la « reine du crime », elle est l'auteur de fiction le plus vendu de tous les temps après Shakespeare.",
            "Ses détectives les plus célèbres sont le Belge Hercule Poirot et la vieille dame anglaise Miss Marple. Dix petits nègres, rebaptisé Ils étaient dix, est le roman policier le plus vendu au monde.",
        ],
        facts: [
            ["Naissance", "15 septembre 1890, Torquay"],
            ["Romans", "66 romans policiers"],
            ["Détectives", "Hercule Poirot, Miss Marple"],
            ["Surnom", "La reine du crime"],
        ],
        url: "https://fr.wikipedia.org/wiki/Agatha_Christie",
    },
};
