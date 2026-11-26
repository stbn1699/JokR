import {GiWarhammer} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const warhammer: QuizzTopic = {
    id: "warhammer",
    name: "Warhammer",
    description: "Space Marines, Chaos et figurines : Warhammer 40,000 et Fantasy",
    category: "jeux-video",
    icon: GiWarhammer,
    color: "#b45309",
    wiki: {
        summary: [
            "Warhammer est une franchise de jeux de figurines créée par l'entreprise britannique Games Workshop. Warhammer Fantasy Battle naît en 1983, puis Warhammer 40,000 en 1987 : dans un futur lointain et sinistre, l'Imperium de l'Humanité, dirigé par l'Empereur-Dieu, lutte contre les Orks, les Eldars, les Tyranides et les forces du Chaos.",
            "L'univers s'étend en romans (Black Library), en jeux vidéo (Dawn of War, Space Marine, Total War: Warhammer) et en animation. En 2015, le monde de Fantasy est détruit et remplacé par Age of Sigmar.",
        ],
        facts: [
            ["Éditeur", "Games Workshop (Nottingham)"],
            ["Warhammer Fantasy", "1983"],
            ["Warhammer 40,000", "1987"],
            ["Age of Sigmar", "2015"],
        ],
        url: "https://fr.wikipedia.org/wiki/Warhammer_40,000",
    },
};
