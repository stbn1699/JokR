import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {createBouchonController} from "../controllers/Bouchon.controller.js";
import {ProgressionService} from "../services/Progression.service.js";
import {GamesService} from "../services/Games.service.js";
import {GamesRepository} from "../repository/Games.repository.js";
import {optionalAuth} from "../middleware/auth.js";

const router = Router();
const db = createDb(pool);
const controller = createBouchonController(new ProgressionService(db), new GamesService(new GamesRepository(db)));

// GET /bouchon/settings (tailles, nombres de coups et XP associée)
router.get("/settings", controller.settings);
// POST /bouchon/generate { size, amount: coups minimum }
router.post("/generate", controller.generate);
// GET /bouchon/games/:gameId (reprendre une partie en cours)
router.get("/games/:gameId", controller.status);
// POST /bouchon/validate { gameId, moves } (connecté = XP enregistrée, invité = simple vérification)
router.post("/validate", optionalAuth, controller.validate);

export default router;
