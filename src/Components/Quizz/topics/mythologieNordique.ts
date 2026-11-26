import {GiThorHammer} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const mythologieNordique: QuizzTopic = {
    id: "mythologie-nordique",
    name: "Mythologie nordique",
    description: "Odin, Thor, Loki et le Ragnarök",
    category: "livres",
    icon: GiThorHammer,
    color: "#475569",
    wiki: {
        summary: [
            "La mythologie nordique est l'ensemble des croyances des peuples scandinaves avant leur christianisation, connues surtout par les Eddas islandaises du XIIIe siècle. Les dieux Ases, menés par Odin, vivent à Asgard, l'un des neuf mondes reliés par le frêne Yggdrasil.",
            "Les récits annoncent le Ragnarök, la bataille finale où les dieux affronteront les géants et les monstres, et où le monde sera détruit puis renaîtra.",
        ],
        facts: [
            ["Dieu principal", "Odin"],
            ["Sources", "L'Edda poétique et l'Edda de Snorri"],
            ["Arbre-monde", "Yggdrasil"],
            ["Fin du monde", "Le Ragnarök"],
        ],
        url: "https://fr.wikipedia.org/wiki/Mythologie_nordique",
    },
};
