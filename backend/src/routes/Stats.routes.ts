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
import {parseStatsFilter} from "../utils/statsFilter.js";

const router = Router();
const db = createDb(pool);
const controller = createStatsController(new StatsRepository(db));
const casinoStats = new CasinoStatsRepository(db);
const shopStats = new ShopStatsRepository(db);

// Administrateur uniquement
router.use(requireAuth, requireAdmin(db));
// GET /stats : tous les chiffres de la page Statistiques
// Toutes les routes ci-dessous acceptent ?de=…&a=… (période, dates ISO) et ?jeu=… (un seul jeu), voir statsFilter.ts
router.get("/", controller.all);
// GET /stats/export : données brutes pour une analyse ailleurs
router.get("/export", controller.export);
// GET /stats/casino : onglet « Hasard » (Plinko, roulette), 30 derniers jours pour la frise (sinon la période)
router.get("/casino", asyncHandler(async (req, res) => {
    const f = parseStatsFilter(req.query);
    if (typeof f === "string") return void res.status(400).json({status: "error", message: f});
    res.status(200).json({status: "ok", data: await casinoStats.all(30, f)});
}));
// GET /stats/shop : onglet « Boutique » (achats, fonds portés), 30 derniers jours pour la frise (sinon la période)
router.get("/shop", asyncHandler(async (req, res) => {
    const f = parseStatsFilter(req.query);
    if (typeof f === "string") return void res.status(400).json({status: "error", message: f});
    res.status(200).json({status: "ok", data: await shopStats.all(30, f)});
}));

export default router;
