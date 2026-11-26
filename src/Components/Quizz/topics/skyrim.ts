import {GiDragonSpiral} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const skyrim: QuizzTopic = {
    id: "skyrim",
    name: "Skyrim",
    description: "The Elder Scrolls V : l'Enfant de dragon et ses cris",
    category: "jeux-video",
    icon: GiDragonSpiral,
    color: "#94a3b8",
    wiki: {
        summary: [
            "The Elder Scrolls V : Skyrim est un jeu de rôle en monde ouvert développé par Bethesda Game Studios, sorti le 11 novembre 2011. Il se déroule dans la province nordique de Bordeciel, sur le continent de Tamriel, alors que les dragons sont de retour.",
            "Le joueur incarne l'Enfant de dragon, capable d'absorber l'âme des dragons et d'utiliser leurs cris, le Thu'um. Le jeu a été réédité sur presque toutes les consoles.",
        ],
        facts: [
            ["Développeur", "Bethesda Game Studios"],
            ["Sortie", "11 novembre 2011"],
            ["Série", "The Elder Scrolls"],
            ["Province", "Bordeciel (Skyrim)"],
        ],
        url: "https://fr.wikipedia.org/wiki/The_Elder_Scrolls_V:_Skyrim",
    },
};
