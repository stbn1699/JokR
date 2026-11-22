import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {createLiensController} from "../controllers/Liens.controller.js";
import {ProgressionService} from "../services/Progression.service.js";
import {GamesService} from "../services/Games.service.js";
import {GamesRepository} from "../repository/Games.repository.js";
import {optionalAuth} from "../middleware/auth.js";

const router = Router();
const db = createDb(pool);
const controller = createLiensController(new ProgressionService(db), new GamesService(new GamesRepository(db)));

// GET /liens/settings (tailles, nombres de paires et XP associée)
router.get("/settings", controller.settings);
// POST /liens/generate { size, amount: paires }
router.post("/generate", controller.generate);
// GET /liens/games/:gameId (reprendre une partie en cours)
router.get("/games/:gameId", controller.status);
// POST /liens/validate { gameId, paths } (connecté = XP enregistrée, invité = simple vérification)
router.post("/validate", optionalAuth, controller.validate);

export default router;
