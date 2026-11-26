import {GiPistolGun} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const jamesBond: QuizzTopic = {
    id: "james-bond",
    name: "James Bond",
    description: "L'agent 007 au service secret de Sa Majesté",
    category: "cinema",
    icon: GiPistolGun,
    color: "#475569",
    wiki: {
        summary: [
            "James Bond est un espion britannique créé par le romancier Ian Fleming en 1953. Agent du MI6 sous le matricule 007, qui lui donne « permis de tuer », il est le héros de la plus longue saga de l'histoire du cinéma, lancée en 1962 avec James Bond 007 contre Dr No.",
            "Six acteurs officiels ont incarné Bond : Sean Connery, George Lazenby, Roger Moore, Timothy Dalton, Pierce Brosnan et Daniel Craig.",
        ],
        facts: [
            ["Créateur", "Ian Fleming (1953)"],
            ["Premier film", "James Bond 007 contre Dr No (1962)"],
            ["Producteur", "EON Productions"],
            ["Matricule", "007"],
        ],
        url: "https://fr.wikipedia.org/wiki/James_Bond",
    },
};
