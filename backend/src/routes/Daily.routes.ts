import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {optionalAuth} from "../middleware/auth.js";
import {createDailyController} from "../controllers/Daily.controller.js";
import {createDailyService} from "../services/daily.js";

const router = Router();
const controller = createDailyController(createDailyService(createDb(pool)));

// GET /daily : défis du jour (et résultats du joueur connecté)
router.get("/", optionalAuth, controller.overview);
// POST /daily/:game/start : commence le défi du jour (SUDOKU ou BINERO)
router.post("/:game/start", optionalAuth, controller.start);
// GET /daily/:game/leaderboard : meilleurs temps du jour
router.get("/:game/leaderboard", optionalAuth, controller.leaderboard);

export default router;
