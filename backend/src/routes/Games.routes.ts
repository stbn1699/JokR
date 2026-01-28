import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {GamesRepository} from "../repository/Games.repository.js";
import {GamesService} from "../services/Games.service.js";
import {createGamesController} from "../controllers/Game.controller.js";

const GamesRoutes = Router();
const db = createDb(pool);
const repo = new GamesRepository(db);
const service = new GamesService(repo);
const controller = createGamesController(service);

GamesRoutes.get("/list", controller.list);

export default GamesRoutes;
