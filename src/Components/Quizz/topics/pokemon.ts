import {GiThrowingBall} from "react-icons/gi";
import type {QuizzTopic} from "./types.ts";

export const pokemon: QuizzTopic = {
    id: "pokemon",
    name: "Pokémon",
    description: "Attrapez-les tous, de Bourg Palette à Paldea",
    category: "jeux-video",
    icon: GiThrowingBall,
    color: "#ef4444",
    wiki: {
        summary: [
            "Pokémon est une franchise japonaise créée par Satoshi Tajiri, lancée en 1996 avec les jeux Pokémon Rouge et Vert sur Game Boy. Le joueur y capture et entraîne des créatures, les Pokémon, pour affronter d'autres dresseurs et devenir Maître.",
            "C'est la franchise de divertissement la plus rentable au monde : jeux vidéo, dessin animé, cartes à collectionner et films. Plus de mille espèces de Pokémon existent aujourd'hui.",
        ],
        facts: [
            ["Créateur", "Satoshi Tajiri"],
            ["Premiers jeux", "Pokémon Rouge et Vert (1996)"],
            ["Développeur", "Game Freak"],
            ["Mascotte", "Pikachu"],
        ],
        url: "https://fr.wikipedia.org/wiki/Pokémon",
    },
};
