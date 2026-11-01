import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {RikudoService} from "../services/Rikudo.service.js";
import {createRikudoController} from "../controllers/Rikudo.controller.js";
import {rikudoStore} from "../services/stores.js";
import {createDailyService} from "../services/daily.js";
import {ProgressionService} from "../services/Progression.service.js";
import {GamesService} from "../services/Games.service.js";
import {GamesRepository} from "../repository/Games.repository.js";
import {optionalAuth} from "../middleware/auth.js";

const router = Router();
const db = createDb(pool);

const controller = createRikudoController(
    new RikudoService(),
    rikudoStore,
    new ProgressionService(db),
    new GamesService(new GamesRepository(db)),
    createDailyService(db),
);

// GET /rikudo/settings (tailles, plages de cases à remplir et XP associée)
router.get("/settings", controller.settings);
// POST /rikudo/generate { size, emptyCells }
router.post("/generate", controller.generate);
// GET /rikudo/games/:gameId (reprendre une partie en cours)
router.get("/games/:gameId", controller.status);
// POST /rikudo/validate { gameId, values } (connecté = XP enregistrée, invité = simple vérification)
router.post("/validate", optionalAuth, controller.validate);

export default router;
