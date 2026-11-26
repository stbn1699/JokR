import {GiDinosaurBones} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const dinosaures: QuizzTopic = {
    id: "dinosaures",
    name: "Dinosaures",
    description: "T. rex, tricératops et le monde du Mésozoïque",
    category: "culture",
    icon: GiDinosaurBones,
    color: "#a3a3a3",
    wiki: {
        summary: [
            "Les dinosaures sont un groupe de reptiles apparu il y a environ 230 millions d'années, au Trias. Ils ont dominé la vie terrestre pendant le Jurassique et le Crétacé.",
            "Les dinosaures non aviens ont disparu il y a 66 millions d'années, probablement après la chute d'un astéroïde. Les oiseaux sont leurs descendants directs.",
        ],
        facts: [
            ["Apparition", "Il y a environ 230 millions d'années"],
            ["Ères", "Trias, Jurassique, Crétacé"],
            ["Extinction", "Il y a 66 millions d'années"],
            ["Descendants", "Les oiseaux"],
        ],
        url: "https://fr.wikipedia.org/wiki/Dinosaures",
    },
};
