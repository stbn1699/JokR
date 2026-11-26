import {GiFist} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const myHeroAcademia: QuizzTopic = {
    id: "my-hero-academia",
    name: "My Hero Academia",
    description: "Deku, All Might et l'académie Yuei",
    category: "anime",
    icon: GiFist,
    color: "#16a34a",
    wiki: {
        summary: [
            "My Hero Academia (Boku no Hero Academia) est un manga de Kōhei Horikoshi publié de 2014 à 2024. Dans un monde où 80 % de la population possède un super-pouvoir, l'Alter, Izuku Midoriya naît sans pouvoir mais rêve de devenir un héros.",
            "Le plus grand héros, All Might, lui transmet son pouvoir, le One For All. Izuku, surnommé Deku, entre alors au lycée Yuei pour devenir un héros professionnel.",
        ],
        facts: [
            ["Auteur", "Kōhei Horikoshi"],
            ["Publication", "2014 – 2024"],
            ["Anime", "Bones"],
            ["Pouvoir du héros", "One For All"],
        ],
        url: "https://fr.wikipedia.org/wiki/My_Hero_Academia",
    },
};
