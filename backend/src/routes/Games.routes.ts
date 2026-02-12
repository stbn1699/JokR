import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {GamesRepository} from "../repository/Games.repository.js";
import {GamesService} from "../services/Games.service.js";
import {createGamesController} from "../controllers/Game.controller.js";

/*
 * Router pour les endpoints liés aux jeux
 * Construction locale des dépendances (db -> repository -> service -> controller)
 * Expose :
 * - GET /list
 * - GET /getBaseXp/:gameCode
 */
const GamesRoutes = Router();
const db = createDb(pool);
const repo = new GamesRepository(db);
const service = new GamesService(repo);
const controller = createGamesController(service);

GamesRoutes.get("/list", controller.list);
GamesRoutes.get("/getBaseXp/:gameCode", controller.getBaseXp);

export default GamesRoutes;
