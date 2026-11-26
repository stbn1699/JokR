import type {QuizzTopic} from "./types.ts";
import {starWars} from "./starWars.ts";
import {harryPotter} from "./harryPotter.ts";
import {cyberpunk} from "./cyberpunk.ts";
import {cars} from "./cars.ts";

export * from "./types.ts";

/**
 * Tous les thèmes du Quizz. Pour en ajouter un : un fichier dans ce dossier (voir starWars.ts), puis une ligne ici.
 * Les tests (quizzMatch.test.ts) vérifient chaque thème : 4 réponses différentes, assez de questions pour une partie.
 */
export const QUIZZ_TOPICS: QuizzTopic[] = [starWars, harryPotter, cyberpunk, cars];

export const findTopic = (id: string | undefined) => QUIZZ_TOPICS.find(t => t.id === id);
