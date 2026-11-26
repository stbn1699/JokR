import {GiHeartOrgan} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const corpsHumain: QuizzTopic = {
    id: "corps-humain",
    name: "Corps humain",
    description: "Organes, os, sang et curiosités de notre corps",
    category: "culture",
    icon: GiHeartOrgan,
    color: "#e11d48",
    wiki: {
        summary: [
            "Le corps humain adulte compte 206 os, plus de 600 muscles et environ 5 litres de sang. Ses grands systèmes (circulatoire, respiratoire, digestif, nerveux, immunitaire…) fonctionnent ensemble pour le maintenir en vie.",
            "Le cœur bat environ 100 000 fois par jour, et le cerveau contient près de 86 milliards de neurones.",
        ],
        facts: [
            ["Os chez l'adulte", "206"],
            ["Volume de sang", "Environ 5 litres"],
            ["Plus grand organe", "La peau"],
            ["Neurones", "Environ 86 milliards"],
        ],
        url: "https://fr.wikipedia.org/wiki/Corps_humain",
    },
};
