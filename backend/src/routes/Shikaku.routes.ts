import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {ShikakuService} from "../services/Shikaku.service.js";
import {createShikakuController} from "../controllers/Shikaku.controller.js";
import {shikakuStore} from "../services/stores.js";
import {createDailyService} from "../services/daily.js";
import {ProgressionService} from "../services/Progression.service.js";
import {GamesService} from "../services/Games.service.js";
import {GamesRepository} from "../repository/Games.repository.js";
import {optionalAuth} from "../middleware/auth.js";

const router = Router();
const db = createDb(pool);

const controller = createShikakuController(
    new ShikakuService(),
    shikakuStore,
    new ProgressionService(db),
    new GamesService(new GamesRepository(db)),
    createDailyService(db),
);

// GET /shikaku/settings (tailles, plages de rectangles donnés et XP associée)
router.get("/settings", controller.settings);
// POST /shikaku/generate { size, hints }
router.post("/generate", controller.generate);
// GET /shikaku/games/:gameId (reprendre une partie en cours)
router.get("/games/:gameId", controller.status);
// POST /shikaku/validate { gameId, regions } (connecté = XP enregistrée, invité = simple vérification)
router.post("/validate", optionalAuth, controller.validate);

export default router;
