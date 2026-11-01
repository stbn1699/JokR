import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {optionalAuth, requireAuth} from "../middleware/auth.js";
import {createDailyController} from "../controllers/Daily.controller.js";
import {createDailyService} from "../services/daily.js";

const router = Router();
const controller = createDailyController(createDailyService(createDb(pool)));

// GET /daily : défis du jour (et résultats du joueur connecté)
router.get("/", optionalAuth, controller.overview);
// GET /daily/history : défis des jours précédents (et résultats du joueur connecté)
router.get("/history", optionalAuth, controller.history);
// Jouer aux défis (du jour ou des jours passés) est réservé aux joueurs connectés ;
// voir les défis, l'historique et les classements reste ouvert à tous.
// POST /daily/:game/start : commence le défi du jour
router.post("/:game/start", requireAuth, controller.start);
// POST /daily/:game/replay/:date : rejoue le défi d'un jour passé (partie normale, hors classement)
router.post("/:game/replay/:date", requireAuth, controller.replay);
// GET /daily/:game/leaderboard[?date=AAAA-MM-JJ] : meilleurs temps du jour (ou d'un jour passé)
router.get("/:game/leaderboard", optionalAuth, controller.leaderboard);

export default router;
