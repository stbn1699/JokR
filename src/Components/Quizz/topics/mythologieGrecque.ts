import {GiGreekTemple} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const mythologieGrecque: QuizzTopic = {
    id: "mythologie-grecque",
    name: "Mythologie grecque",
    description: "Les dieux de l'Olympe, les héros et les monstres",
    category: "livres",
    icon: GiGreekTemple,
    color: "#0284c7",
    wiki: {
        summary: [
            "La mythologie grecque rassemble les récits des anciens Grecs sur leurs dieux, leurs héros et l'origine du monde. Les douze dieux de l'Olympe, menés par Zeus, règnent sur les hommes après avoir vaincu les Titans.",
            "Ces mythes nous sont parvenus grâce à Homère (L'Iliade, L'Odyssée), Hésiode ou les tragédiens. Héraclès, Ulysse, Persée ou Thésée en sont les héros les plus célèbres.",
        ],
        facts: [
            ["Roi des dieux", "Zeus"],
            ["Demeure des dieux", "Le mont Olympe"],
            ["Sources", "Homère, Hésiode, Ovide"],
            ["Épopées", "L'Iliade et L'Odyssée"],
        ],
        url: "https://fr.wikipedia.org/wiki/Mythologie_grecque",
    },
};
