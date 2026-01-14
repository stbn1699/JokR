import { Router } from "express";
import { pool } from "../db/pool.js";
import { createDb } from "../db/kysely.js";
import { GamesRepository } from "../modules/games/games.repository.js";
import { GamesService } from "../modules/games/games.service.js";
import { createGamesController } from "../modules/games/games.controller.js";

const router = Router();

// wiring simple (tu pourras faire un vrai DI plus tard)
const db = createDb(pool);
const repo = new GamesRepository(db);
const service = new GamesService(repo);
const controller = createGamesController(service);

router.get("/list", controller.list);

export default router;
