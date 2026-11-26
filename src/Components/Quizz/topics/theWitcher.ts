import {GiWolfHead} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const theWitcher: QuizzTopic = {
    id: "the-witcher",
    name: "The Witcher",
    description: "Geralt de Riv, Ciri, Yennefer et les monstres du Continent",
    category: "series",
    icon: GiWolfHead,
    color: "#64748b",
    wiki: {
        summary: [
            "The Witcher (Le Sorceleur) est une saga de fantasy créée par l'écrivain polonais Andrzej Sapkowski. Geralt de Riv, un sorceleur aux cheveux blancs transformé par des mutations, chasse les monstres contre de l'argent.",
            "La saga a été adaptée en jeux vidéo par CD Projekt Red, dont The Witcher 3 : Wild Hunt (2015), puis en série Netflix à partir de 2019 avec Henry Cavill.",
        ],
        facts: [
            ["Auteur", "Andrzej Sapkowski"],
            ["Jeux vidéo", "CD Projekt Red (2007, 2011, 2015)"],
            ["Série", "Netflix (depuis 2019)"],
            ["Héros", "Geralt de Riv"],
        ],
        url: "https://fr.wikipedia.org/wiki/The_Witcher_(série_télévisée)",
    },
};
