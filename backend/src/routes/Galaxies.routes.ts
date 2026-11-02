import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {GalaxiesService} from "../services/Galaxies.service.js";
import {createGalaxiesController} from "../controllers/Galaxies.controller.js";
import {galaxiesStore} from "../services/stores.js";
import {createDailyService} from "../services/daily.js";
import {ProgressionService} from "../services/Progression.service.js";
import {GamesService} from "../services/Games.service.js";
import {GamesRepository} from "../repository/Games.repository.js";
import {optionalAuth} from "../middleware/auth.js";

const router = Router();
const db = createDb(pool);

const controller = createGalaxiesController(
    new GalaxiesService(),
    galaxiesStore,
    new ProgressionService(db),
    new GamesService(new GamesRepository(db)),
    createDailyService(db),
);

// GET /galaxies/settings (tailles, plages de murs donnés et XP associée)
router.get("/settings", controller.settings);
// POST /galaxies/generate { size, hints }
router.post("/generate", controller.generate);
// GET /galaxies/games/:gameId (reprendre une partie en cours)
router.get("/games/:gameId", controller.status);
// POST /galaxies/validate { gameId, regions } (connecté = XP enregistrée, invité = simple vérification)
router.post("/validate", optionalAuth, controller.validate);

export default router;
