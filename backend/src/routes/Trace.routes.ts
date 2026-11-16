import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {TraceService} from "../services/Trace.service.js";
import {createTraceController} from "../controllers/Trace.controller.js";
import {traceStore} from "../services/stores.js";
import {createDailyService} from "../services/daily.js";
import {ProgressionService} from "../services/Progression.service.js";
import {GamesService} from "../services/Games.service.js";
import {GamesRepository} from "../repository/Games.repository.js";
import {optionalAuth} from "../middleware/auth.js";
import {LevelsRepository} from "../repository/Levels.repository.js";

const router = Router();
const db = createDb(pool);

const controller = createTraceController(
    new TraceService(),
    traceStore,
    new ProgressionService(db),
    new GamesService(new GamesRepository(db)),
    createDailyService(db), new LevelsRepository(db),
);

// GET /trace/settings (tailles, plages de numéros donnés en plus et XP associée)
router.get("/settings", controller.settings);
// POST /trace/generate { size, hints }
router.post("/generate", controller.generate);
// GET /trace/games/:gameId (reprendre une partie en cours)
router.get("/games/:gameId", controller.status);
// POST /trace/validate { gameId, path } (connecté = XP enregistrée, invité = simple vérification)
router.post("/validate", optionalAuth, controller.validate);

export default router;
