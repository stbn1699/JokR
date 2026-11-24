import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {createTuyauxController} from "../controllers/Tuyaux.controller.js";
import {ProgressionService} from "../services/Progression.service.js";
import {GamesService} from "../services/Games.service.js";
import {GamesRepository} from "../repository/Games.repository.js";
import {createDailyService} from "../services/daily.js";
import {optionalAuth} from "../middleware/auth.js";

const router = Router();
const db = createDb(pool);
const controller = createTuyauxController(new ProgressionService(db), new GamesService(new GamesRepository(db)), createDailyService(db));

// GET /tuyaux/settings (tailles, cases données possibles et XP associée)
router.get("/settings", controller.settings);
// POST /tuyaux/generate { size, amount: cases données }
router.post("/generate", controller.generate);
// GET /tuyaux/games/:gameId (reprendre une partie en cours)
router.get("/games/:gameId", controller.status);
// POST /tuyaux/validate { gameId, turns } (connecté = XP enregistrée, invité = simple vérification)
router.post("/validate", optionalAuth, controller.validate);

export default router;
