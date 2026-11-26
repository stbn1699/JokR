import {GiRomanShield} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const asterix: QuizzTopic = {
    id: "asterix",
    name: "Astérix",
    description: "Le petit village gaulois qui résiste encore et toujours à l'envahisseur",
    category: "livres",
    icon: GiRomanShield,
    color: "#f59e0b",
    wiki: {
        summary: [
            "Astérix est une série de bande dessinée créée en 1959 par le scénariste René Goscinny et le dessinateur Albert Uderzo, dans le journal Pilote. En 50 avant Jésus-Christ, un petit village d'irréductibles Gaulois résiste à l'occupant romain grâce à la potion magique du druide Panoramix.",
            "La série est l'une des plus vendues au monde. Depuis 2013, elle est poursuivie par Jean-Yves Ferri puis Fabcaro au scénario et Didier Conrad au dessin.",
        ],
        facts: [
            ["Créateurs", "René Goscinny et Albert Uderzo"],
            ["Première apparition", "Pilote, 29 octobre 1959"],
            ["Époque", "50 av. J.-C."],
            ["Héros", "Astérix et Obélix"],
        ],
        url: "https://fr.wikipedia.org/wiki/Astérix",
    },
};
