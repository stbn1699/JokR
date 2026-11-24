import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {createDemineurController} from "../controllers/Demineur.controller.js";
import {ProgressionService} from "../services/Progression.service.js";
import {GamesService} from "../services/Games.service.js";
import {GamesRepository} from "../repository/Games.repository.js";
import {createDailyService} from "../services/daily.js";
import {optionalAuth} from "../middleware/auth.js";

const router = Router();
const db = createDb(pool);
const controller = createDemineurController(new ProgressionService(db), new GamesService(new GamesRepository(db)), createDailyService(db));

// GET /demineur/settings (tailles, nombres de mines et XP associée)
router.get("/settings", controller.settings);
// POST /demineur/generate { size, amount: mines }
router.post("/generate", controller.generate);
// GET /demineur/games/:gameId (reprendre une partie en cours)
router.get("/games/:gameId", controller.status);
// POST /demineur/reveal { gameId, cells } (cases libérées, ou toutes les mines si l'une explose)
router.post("/reveal", controller.reveal);
// POST /demineur/validate { gameId } (connecté = XP enregistrée, invité = simple vérification)
router.post("/validate", optionalAuth, controller.validate);

export default router;
