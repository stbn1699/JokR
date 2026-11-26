import {GiWorld} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const capitales: QuizzTopic = {
    id: "capitales",
    name: "Capitales du monde",
    description: "Pays, capitales et continents",
    category: "culture",
    icon: GiWorld,
    color: "#0369a1",
    wiki: {
        summary: [
            "Une capitale est la ville où siègent le gouvernement et les institutions d'un pays. Le monde compte environ 195 États souverains, chacun avec sa capitale, parfois plusieurs, comme l'Afrique du Sud ou la Bolivie.",
            "Certaines capitales ne sont pas les plus grandes villes de leur pays : Canberra en Australie, Ottawa au Canada, Brasilia au Brésil ou Washington aux États-Unis.",
        ],
        facts: [
            ["États souverains", "Environ 195"],
            ["Capitale la plus haute", "La Paz (siège du gouvernement bolivien)"],
            ["Plus petit État", "Le Vatican"],
            ["Questions", "tirées de Wikidata (CC0)"],
        ],
        url: "https://fr.wikipedia.org/wiki/Liste_des_capitales_du_monde",
    },
};
