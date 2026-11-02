import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {TectonicService} from "../services/Tectonic.service.js";
import {createTectonicController} from "../controllers/Tectonic.controller.js";
import {tectonicStore} from "../services/stores.js";
import {createDailyService} from "../services/daily.js";
import {ProgressionService} from "../services/Progression.service.js";
import {GamesService} from "../services/Games.service.js";
import {GamesRepository} from "../repository/Games.repository.js";
import {optionalAuth} from "../middleware/auth.js";

const router = Router();
const db = createDb(pool);

const controller = createTectonicController(
    new TectonicService(),
    tectonicStore,
    new ProgressionService(db),
    new GamesService(new GamesRepository(db)),
    createDailyService(db),
);

// GET /tectonic/settings (tailles, plages de cases à remplir et XP associée)
router.get("/settings", controller.settings);
// POST /tectonic/generate { size, emptyCells }
router.post("/generate", controller.generate);
// GET /tectonic/games/:gameId (reprendre une partie en cours)
router.get("/games/:gameId", controller.status);
// POST /tectonic/validate { gameId, values } (connecté = XP enregistrée, invité = simple vérification)
router.post("/validate", optionalAuth, controller.validate);

export default router;
