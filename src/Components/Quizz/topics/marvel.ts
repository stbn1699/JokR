import {GiSpiderMask} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const marvel: QuizzTopic = {
    id: "marvel",
    name: "Marvel",
    description: "Les Avengers et l'univers cinématographique Marvel",
    category: "cinema",
    icon: GiSpiderMask,
    color: "#e11d48",
    wiki: {
        summary: [
            "L'univers cinématographique Marvel (MCU) est une franchise de films et de séries produits par Marvel Studios depuis Iron Man en 2008. Les films partagent un même univers où se croisent Iron Man, Captain America, Thor, Hulk, Black Widow et des dizaines d'autres héros.",
            "La « saga de l'Infini » s'achève avec Avengers: Endgame en 2019, qui devient alors le plus gros succès de l'histoire du cinéma au box-office.",
        ],
        facts: [
            ["Producteur", "Marvel Studios (Kevin Feige)"],
            ["Premier film", "Iron Man (2008)"],
            ["Propriétaire", "Disney (depuis 2009)"],
            ["Grand méchant de l'Infini", "Thanos"],
        ],
        url: "https://fr.wikipedia.org/wiki/Univers_cinématographique_Marvel",
    },
};
