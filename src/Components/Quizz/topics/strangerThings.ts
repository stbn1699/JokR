import {GiWalkieTalkie} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const strangerThings: QuizzTopic = {
    id: "stranger-things",
    name: "Stranger Things",
    description: "Hawkins, l'Upside Down et une bande de copains à vélo",
    category: "series",
    icon: GiWalkieTalkie,
    color: "#dc2626",
    wiki: {
        summary: [
            "Stranger Things est une série télévisée américaine créée par les frères Duffer, diffusée sur Netflix depuis 2016. Dans la petite ville de Hawkins, dans l'Indiana des années 1980, la disparition du jeune Will Byers révèle l'existence d'un monde parallèle, l'Upside Down.",
            "Ses amis Mike, Dustin et Lucas s'allient à Eleven, une fillette aux pouvoirs psychiques échappée d'un laboratoire secret.",
        ],
        facts: [
            ["Créateurs", "Matt et Ross Duffer"],
            ["Plateforme", "Netflix"],
            ["Première diffusion", "15 juillet 2016"],
            ["Lieu", "Hawkins, Indiana (années 1980)"],
        ],
        url: "https://fr.wikipedia.org/wiki/Stranger_Things",
    },
};
