import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {createPaturagesController} from "../controllers/Paturages.controller.js";
import {ProgressionService} from "../services/Progression.service.js";
import {GamesService} from "../services/Games.service.js";
import {GamesRepository} from "../repository/Games.repository.js";
import {createDailyService} from "../services/daily.js";
import {optionalAuth} from "../middleware/auth.js";

const router = Router();
const db = createDb(pool);
const controller = createPaturagesController(new ProgressionService(db), new GamesService(new GamesRepository(db)), createDailyService(db));

// GET /paturages/settings (tailles, carrés donnés et XP associée)
router.get("/settings", controller.settings);
// POST /paturages/generate { size, amount: carrés donnés }
router.post("/generate", controller.generate);
// GET /paturages/games/:gameId (reprendre une partie en cours)
router.get("/games/:gameId", controller.status);
// POST /paturages/validate { gameId, squares } (connecté = XP enregistrée, invité = simple vérification)
router.post("/validate", optionalAuth, controller.validate);

export default router;
