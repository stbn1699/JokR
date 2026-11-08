import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {requireAuth} from "../middleware/auth.js";
import {requireAdmin} from "../middleware/admin.js";
import {StatsRepository} from "../repository/Stats.repository.js";
import {createStatsController} from "../controllers/Stats.controller.js";
import {CasinoStatsRepository} from "../repository/CasinoStats.repository.js";
import {ShopStatsRepository} from "../repository/ShopStats.repository.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";

const router = Router();
const db = createDb(pool);
const controller = createStatsController(new StatsRepository(db));
const casinoStats = new CasinoStatsRepository(db);
const shopStats = new ShopStatsRepository(db);

// Administrateur uniquement
router.use(requireAuth, requireAdmin(db));
// GET /stats : tous les chiffres de la page Statistiques
router.get("/", controller.all);
// GET /stats/export : données brutes pour une analyse ailleurs
router.get("/export", controller.export);
// GET /stats/casino : onglet « Hasard » (Plinko, roulette), 30 derniers jours pour la frise
router.get("/casino", asyncHandler(async (_req, res) => {
    res.status(200).json({status: "ok", data: await casinoStats.all(30)});
}));
// GET /stats/shop : onglet « Boutique » (achats, fonds portés), 30 derniers jours pour la frise
router.get("/shop", asyncHandler(async (_req, res) => {
    res.status(200).json({status: "ok", data: await shopStats.all(30)});
}));

export default router;
