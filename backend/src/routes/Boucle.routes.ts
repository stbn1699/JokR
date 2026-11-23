import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {createBoucleController} from "../controllers/Boucle.controller.js";
import {ProgressionService} from "../services/Progression.service.js";
import {GamesService} from "../services/Games.service.js";
import {GamesRepository} from "../repository/Games.repository.js";
import {optionalAuth} from "../middleware/auth.js";

const router = Router();
const db = createDb(pool);
const controller = createBoucleController(new ProgressionService(db), new GamesService(new GamesRepository(db)));

// GET /boucle/settings (tailles, nombres de murs et XP associée)
router.get("/settings", controller.settings);
// POST /boucle/generate { size, amount: murs }
router.post("/generate", controller.generate);
// GET /boucle/games/:gameId (reprendre une partie en cours)
router.get("/games/:gameId", controller.status);
// POST /boucle/validate { gameId, loop } (connecté = XP enregistrée, invité = simple vérification)
router.post("/validate", optionalAuth, controller.validate);

export default router;
