import {GiFleurDeLys} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const histoireFrance: QuizzTopic = {
    id: "histoire-france",
    name: "Histoire de France",
    description: "Des Gaulois à la Ve République, rois, révolutions et républiques",
    category: "culture",
    icon: GiFleurDeLys,
    color: "#1e3a8a",
    wiki: {
        summary: [
            "L'histoire de France s'étend de la Gaule antique, conquise par Jules César, aux royaumes francs, à la monarchie capétienne et à l'absolutisme de Louis XIV. La Révolution de 1789 abolit la monarchie absolue et ouvre une période de régimes successifs : République, Empire, Restauration.",
            "Depuis 1958, la France vit sous la Ve République, fondée par le général de Gaulle.",
        ],
        facts: [
            ["Prise de la Bastille", "14 juillet 1789"],
            ["Premier empereur", "Napoléon Ier (1804)"],
            ["Régime actuel", "Ve République (1958)"],
            ["Devise", "Liberté, Égalité, Fraternité"],
        ],
        url: "https://fr.wikipedia.org/wiki/Histoire_de_France",
    },
};
