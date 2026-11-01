import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {BineroService} from "../services/Binero.service.js";
import {createBineroController} from "../controllers/Binero.controller.js";
import {bineroStore} from "../services/stores.js";
import {createDailyService} from "../services/daily.js";
import {ProgressionService} from "../services/Progression.service.js";
import {GamesService} from "../services/Games.service.js";
import {GamesRepository} from "../repository/Games.repository.js";
import {optionalAuth} from "../middleware/auth.js";

const router = Router();
const db = createDb(pool);

const controller = createBineroController(
    new BineroService(),
    // parties en cours partagées avec le défi du jour
    bineroStore,
    new ProgressionService(db),
    new GamesService(new GamesRepository(db)),
    createDailyService(db),
);

// GET /binero/settings (tailles, plages de cases à remplir et XP associée)
router.get("/settings", controller.settings);
// POST /binero/generate { size, emptyCells }
router.post("/generate", controller.generate);
// GET /binero/games/:gameId (reprendre une partie en cours)
router.get("/games/:gameId", controller.status);
// POST /binero/validate { gameId, grid } (connecté = XP enregistrée, invité = simple vérification)
router.post("/validate", optionalAuth, controller.validate);

export default router;
