import {GiPirateHat} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const piratesDesCaraibes: QuizzTopic = {
    id: "pirates-des-caraibes",
    name: "Pirates des Caraïbes",
    description: "Jack Sparrow, le Black Pearl et les malédictions des mers",
    category: "cinema",
    icon: GiPirateHat,
    color: "#92400e",
    wiki: {
        summary: [
            "Pirates des Caraïbes est une saga de films produite par Jerry Bruckheimer pour Disney, inspirée d'une attraction des parcs Disney. Le premier film, La Malédiction du Black Pearl, sort en 2003.",
            "Johnny Depp y incarne le capitaine Jack Sparrow, pirate excentrique et rusé, aux côtés de Will Turner et Elizabeth Swann. Cinq films sont sortis entre 2003 et 2017.",
        ],
        facts: [
            ["Producteur", "Jerry Bruckheimer"],
            ["Premier film", "La Malédiction du Black Pearl (2003)"],
            ["Héros", "Capitaine Jack Sparrow"],
            ["Musique", "Klaus Badelt, Hans Zimmer"],
        ],
        url: "https://fr.wikipedia.org/wiki/Pirates_des_Caraïbes",
    },
};
