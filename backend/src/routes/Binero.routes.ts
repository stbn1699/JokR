import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {BineroService} from "../services/Binero.service.js";
import {createBineroController} from "../controllers/Binero.controller.js";
import {PuzzleStore} from "../services/PuzzleStore.js";
import {ProgressionService} from "../services/Progression.service.js";
import {GamesService} from "../services/Games.service.js";
import {GamesRepository} from "../repository/Games.repository.js";
import {optionalAuth} from "../middleware/auth.js";
import type {BineroGrid} from "../utils/binero.js";

const router = Router();
const db = createDb(pool);

const controller = createBineroController(
    new BineroService(),
    new PuzzleStore<BineroGrid>(),
    new ProgressionService(db),
    new GamesService(new GamesRepository(db)),
);

// GET /binero/settings (tailles, plages de cases à remplir et XP associée)
router.get("/settings", controller.settings);
// POST /binero/generate { size, emptyCells }
router.post("/generate", controller.generate);
// POST /binero/validate { gameId, grid } (connecté = XP enregistrée, invité = simple vérification)
router.post("/validate", optionalAuth, controller.validate);

export default router;
