import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {GameStatsRepository} from "../repository/GameStats.repository.js";
import {GameStatsService} from "../services/GameStats.service.js";
import {GameStatsController} from "../controllers/GameStats.controller.js";

const GameStatsRoutes = Router();
const db = createDb(pool);
const repo = new GameStatsRepository(db);
const service = new GameStatsService(repo);
const controller = GameStatsController(service);

GameStatsRoutes.post("/gameWin", controller.gameWin);
GameStatsRoutes.get("/user/:userId", controller.getStatsByUserId);

export default GameStatsRoutes;
