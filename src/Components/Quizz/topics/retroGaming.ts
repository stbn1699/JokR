import {GiJoystick} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const retroGaming: QuizzTopic = {
    id: "retro-gaming",
    name: "Retro gaming",
    description: "Consoles et jeux cultes des années 1970 à 1990",
    category: "jeux-video",
    icon: GiJoystick,
    color: "#7c3aed",
    wiki: {
        summary: [
            "Le retro gaming désigne la pratique et la collection des jeux vidéo anciens. Des bornes d'arcade comme Pong et Pac-Man aux consoles NES, Mega Drive et PlayStation, les années 1970 à 1990 ont vu naître les grands genres du jeu vidéo.",
            "La guerre des consoles entre Nintendo et Sega, puis l'arrivée de Sony, a marqué toute une génération de joueurs.",
        ],
        facts: [
            ["Premier succès commercial", "Pong (1972)"],
            ["Console de salon pionnière", "Magnavox Odyssey (1972)"],
            ["Rivalité culte", "Nintendo contre Sega"],
            ["Format", "Cartouches puis CD-ROM"],
        ],
        url: "https://fr.wikipedia.org/wiki/Retrogaming",
    },
};
