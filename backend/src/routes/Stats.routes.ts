import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {requireAuth} from "../middleware/auth.js";
import {requireAdmin} from "../middleware/admin.js";
import {StatsRepository} from "../repository/Stats.repository.js";
import {createStatsController} from "../controllers/Stats.controller.js";

const router = Router();
const db = createDb(pool);
const controller = createStatsController(new StatsRepository(db));

// Administrateur uniquement
router.use(requireAuth, requireAdmin(db));
// GET /stats : tous les chiffres de la page Statistiques
router.get("/", controller.all);
// GET /stats/export : données brutes pour une analyse ailleurs
router.get("/export", controller.export);

export default router;
