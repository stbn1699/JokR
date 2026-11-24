import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {createColoriaController} from "../controllers/Coloria.controller.js";
import {ProgressionService} from "../services/Progression.service.js";
import {GamesService} from "../services/Games.service.js";
import {GamesRepository} from "../repository/Games.repository.js";
import {createDailyService} from "../services/daily.js";
import {optionalAuth} from "../middleware/auth.js";

const router = Router();
const db = createDb(pool);
const controller = createColoriaController(new ProgressionService(db), new GamesService(new GamesRepository(db)), createDailyService(db));

// GET /coloria/settings (nombres de zones et de couleurs, XP associée)
router.get("/settings", controller.settings);
// POST /coloria/generate { size: zones, amount: couleurs }
router.post("/generate", controller.generate);
// GET /coloria/games/:gameId (reprendre une partie en cours)
router.get("/games/:gameId", controller.status);
// POST /coloria/validate { gameId, colors } (connecté = XP enregistrée, invité = simple vérification)
router.post("/validate", optionalAuth, controller.validate);

export default router;
