import {pool} from "../../db/pool.js";
import {createDb} from "../../db/kysely.js";
import {AchievementsService} from "./AchievementsService.js";

// Succès des joueurs, partagés par tous les jeux, la boutique et les planificateurs
export const achievements = new AchievementsService(createDb(pool));
