import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {optionalAuth} from "../middleware/auth.js";
import {LeaderboardRepository} from "../repository/Leaderboard.repository.js";
import {GamesService} from "../services/Games.service.js";
import {GamesRepository} from "../repository/Games.repository.js";
import {createLeaderboardController} from "../controllers/Leaderboard.controller.js";
import {FriendsRepository} from "../repository/Friends.repository.js";

const router = Router();
const db = createDb(pool);
const controller = createLeaderboardController(new LeaderboardRepository(db), new GamesService(new GamesRepository(db)), new FriendsRepository(db));

// GET /leaderboard/xp : classement par XP globale
router.get("/xp", optionalAuth, controller.xp);
// GET /leaderboard/credits : classement par crédits
router.get("/credits", optionalAuth, controller.credits);
// GET /leaderboard/games/:game : classement d'un jeu
router.get("/games/:game", optionalAuth, controller.game);

export default router;
