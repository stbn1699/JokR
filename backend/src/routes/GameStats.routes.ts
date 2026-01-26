import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {GameStatsRepository} from "../repository/GameStats.repository.js";
import {GameStatsService} from "../services/GameStats.service.js";
import {GameStatsController} from "../controllers/GameStats.controller.js";

const gameStatsRoutes = Router();

// wiring simple (tu pourras faire un vrai DI plus tard)
const db = createDb(pool);
const repo = new GameStatsRepository(db);
const service = new GameStatsService(repo);
const controller = GameStatsController(service);

gameStatsRoutes.post("/gameWin", controller.gameWin);
gameStatsRoutes.get("/user/:userId", controller.getStatsByUserId);

export default gameStatsRoutes;
