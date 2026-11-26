import {GiMicrophone} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const rapFrancais: QuizzTopic = {
    id: "rap-francais",
    name: "Rap français",
    description: "D'IAM et NTM à PNL, Booba et Orelsan",
    category: "musique",
    icon: GiMicrophone,
    color: "#a855f7",
    wiki: {
        summary: [
            "Le rap français apparaît dans les années 1980 et explose dans les années 1990 avec MC Solaar, IAM, NTM ou Ministère A.M.E.R. La France devient le deuxième marché mondial du hip-hop.",
            "Depuis les années 2010, le rap est le genre le plus écouté en France, porté par Booba, PNL, Jul, Nekfeu, Orelsan, Ninho, Damso ou SCH.",
        ],
        facts: [
            ["Années fondatrices", "1990"],
            ["Pionniers", "MC Solaar, IAM, NTM"],
            ["Record de certifications", "Jul"],
            ["Villes phares", "Paris, Marseille"],
        ],
        url: "https://fr.wikipedia.org/wiki/Hip-hop_français",
    },
};
