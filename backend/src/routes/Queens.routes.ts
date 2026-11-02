import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {QueensService} from "../services/Queens.service.js";
import {createQueensController} from "../controllers/Queens.controller.js";
import {queensStore} from "../services/stores.js";
import {createDailyService} from "../services/daily.js";
import {ProgressionService} from "../services/Progression.service.js";
import {GamesService} from "../services/Games.service.js";
import {GamesRepository} from "../repository/Games.repository.js";
import {optionalAuth} from "../middleware/auth.js";

const router = Router();
const db = createDb(pool);

const controller = createQueensController(
    new QueensService(),
    queensStore,
    new ProgressionService(db),
    new GamesService(new GamesRepository(db)),
    createDailyService(db),
);

// GET /queens/settings (tailles, plages de dames données et XP associée)
router.get("/settings", controller.settings);
// POST /queens/generate { size, hints }
router.post("/generate", controller.generate);
// GET /queens/games/:gameId (reprendre une partie en cours)
router.get("/games/:gameId", controller.status);
// POST /queens/validate { gameId, queens } (connecté = XP enregistrée, invité = simple vérification)
router.post("/validate", optionalAuth, controller.validate);

export default router;
