import {FaTwitch} from "react-icons/fa";
import type {QuizzTopic} from "./types.ts";

export const twitch: QuizzTopic = {
    id: "twitch",
    name: "Twitch et streamers",
    description: "ZEvent, Karmine Corp et les stars du live",
    category: "internet",
    icon: FaTwitch,
    color: "#9146ff",
    wiki: {
        summary: [
            "Twitch est une plateforme de diffusion en direct lancée en 2011, rachetée par Amazon en 2014. D'abord consacrée aux jeux vidéo, elle accueille aussi des émissions, des discussions et des événements caritatifs.",
            "En France, des streamers comme ZeratoR, Kameto, Domingo, Ponce ou Antoine Daniel ont créé des rendez-vous suivis par des centaines de milliers de spectateurs, comme le ZEvent ou les matchs de la Karmine Corp.",
        ],
        facts: [
            ["Lancement", "2011"],
            ["Propriétaire", "Amazon (depuis 2014)"],
            ["Événement caritatif", "Le ZEvent (ZeratoR)"],
            ["Couleur", "Violet"],
        ],
        url: "https://fr.wikipedia.org/wiki/Twitch",
    },
};
