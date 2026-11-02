import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {GameTracker} from "./GameTracker.js";

// Suivi des parties pour les statistiques, partagé par tous les jeux et le défi du jour
export const tracker = new GameTracker(createDb(pool));
