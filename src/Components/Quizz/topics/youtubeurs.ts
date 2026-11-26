import {FaYoutube} from "react-icons/fa";
import type {QuizzTopic} from "./types.ts";

export const youtubeurs: QuizzTopic = {
    id: "youtubeurs",
    name: "YouTubeurs français",
    description: "Squeezie, Amixem, McFly et Carlito, Inoxtag et toute la bande",
    category: "internet",
    icon: FaYoutube,
    color: "#dc2626",
    wiki: {
        summary: [
            "Depuis le début des années 2010, une génération de vidéastes français a fait de YouTube un média à part entière : humour avec Cyprien, Norman ou le Palmashow, jeux vidéo avec Squeezie ou le Joueur du Grenier, défis et concepts avec Amixem, McFly et Carlito ou Inoxtag.",
            "Certains sont devenus de véritables producteurs : courses automobiles du GP Explorer, documentaires diffusés au cinéma, albums de musique ou émissions d'actualité comme HugoDécrypte.",
        ],
        facts: [
            ["Pionniers", "Cyprien, Norman, Squeezie"],
            ["Événement", "Le GP Explorer (Squeezie, depuis 2022)"],
            ["Documentaire", "Kaizen d'Inoxtag (2024)"],
            ["Plateforme", "YouTube (Google)"],
        ],
        url: "https://fr.wikipedia.org/wiki/YouTube",
    },
};
