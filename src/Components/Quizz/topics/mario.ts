import {GiMushroom} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const mario: QuizzTopic = {
    id: "mario",
    name: "Mario",
    description: "Le plombier moustachu, le Royaume Champignon et Bowser",
    category: "jeux-video",
    icon: GiMushroom,
    color: "#dc2626",
    wiki: {
        summary: [
            "Mario est le personnage emblématique de Nintendo, créé par Shigeru Miyamoto. Apparu en 1981 dans Donkey Kong sous le nom de Jumpman, ce plombier italo-américain devient la star de Super Mario Bros. en 1985.",
            "Avec son frère Luigi, il protège le Royaume Champignon et la princesse Peach contre Bowser. Mario est la série de jeux vidéo la plus vendue de l'histoire.",
        ],
        facts: [
            ["Créateur", "Shigeru Miyamoto"],
            ["Première apparition", "Donkey Kong (1981)"],
            ["Éditeur", "Nintendo"],
            ["Ennemi juré", "Bowser"],
        ],
        url: "https://fr.wikipedia.org/wiki/Mario",
    },
};
