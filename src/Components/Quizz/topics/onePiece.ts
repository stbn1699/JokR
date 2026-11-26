import {GiPirateFlag} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const onePiece: QuizzTopic = {
    id: "one-piece",
    name: "One Piece",
    description: "Luffy, l'équipage du Chapeau de paille et le trésor de Gol D. Roger",
    category: "anime",
    icon: GiPirateFlag,
    color: "#dc2626",
    wiki: {
        summary: [
            "One Piece est un manga d'Eiichirō Oda publié depuis 1997 dans le Weekly Shōnen Jump. Monkey D. Luffy, un garçon au corps élastique, part en mer avec son équipage pour trouver le One Piece, le trésor légendaire de Gol D. Roger, et devenir le Roi des pirates.",
            "C'est le manga le plus vendu de l'histoire, avec plus de 500 millions d'exemplaires. L'anime est diffusé depuis 1999.",
        ],
        facts: [
            ["Auteur", "Eiichirō Oda"],
            ["Début", "1997 (Weekly Shōnen Jump)"],
            ["Anime", "Toei Animation (depuis 1999)"],
            ["Record", "Manga le plus vendu au monde"],
        ],
        url: "https://fr.wikipedia.org/wiki/One_Piece",
    },
};
