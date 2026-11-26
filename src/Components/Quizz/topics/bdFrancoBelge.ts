import {GiChatBubble} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const bdFrancoBelge: QuizzTopic = {
    id: "bd-franco-belge",
    name: "BD franco-belge",
    description: "Lucky Luke, Gaston, Spirou, les Schtroumpfs et compagnie",
    category: "livres",
    icon: GiChatBubble,
    color: "#e11d48",
    wiki: {
        summary: [
            "La bande dessinée franco-belge désigne la BD publiée en France et en Belgique, née dans les journaux Tintin, Spirou et Pilote. Elle a donné naissance à des séries cultes : Lucky Luke, Gaston Lagaffe, Spirou et Fantasio, les Schtroumpfs, Blake et Mortimer, Boule et Bill ou Thorgal.",
            "Le Festival international de la bande dessinée d'Angoulême, créé en 1974, est le grand rendez-vous annuel du « neuvième art ».",
        ],
        facts: [
            ["Grands journaux", "Tintin, Spirou, Pilote"],
            ["Festival", "Angoulême (depuis 1974)"],
            ["Surnom", "Le neuvième art"],
            ["Format", "L'album cartonné de 48 pages"],
        ],
        url: "https://fr.wikipedia.org/wiki/Bande_dessinée_franco-belge",
    },
};
