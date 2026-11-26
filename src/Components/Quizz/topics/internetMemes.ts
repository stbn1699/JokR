import {GiImpLaugh} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const internetMemes: QuizzTopic = {
    id: "internet-memes",
    name: "Internet et mèmes",
    description: "Réseaux sociaux, mèmes cultes et culture web",
    category: "internet",
    icon: GiImpLaugh,
    color: "#f43f5e",
    wiki: {
        summary: [
            "Un mème Internet est une image, une vidéo ou une expression reprise et détournée massivement en ligne. Le terme vient du biologiste Richard Dawkins, qui l'a inventé en 1976 pour désigner une idée qui se propage comme un gène.",
            "Des chats de YouTube au Rickroll, en passant par Doge et les réactions en GIF, les mèmes sont devenus un langage commun du web.",
        ],
        facts: [
            ["Origine du mot", "Richard Dawkins (1976)"],
            ["Réseaux majeurs", "YouTube, TikTok, Instagram, X"],
            ["Mème culte", "Le Rickroll"],
            ["Vidéo la plus vue sur YouTube", "Baby Shark Dance"],
        ],
        url: "https://fr.wikipedia.org/wiki/Mème_Internet",
    },
};
