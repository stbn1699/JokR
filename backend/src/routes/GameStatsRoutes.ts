import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {GameStatsRepository} from "../repository/GameStats.repository.js";
import {GameStatsService} from "../services/GameStats.service.js";
import {GameStatsController} from "../controllers/GameStats.controller.js";

/*
 * Router pour les endpoints liés aux statistiques de jeux
 * Construit les dépendances localement (DB -> repository -> service -> controller)
 * Expose :
 * - GET /user/:userId : récupérer les stats d'un utilisateur
 *
 * Il n'y a volontairement pas de route pour "déclarer" une victoire : l'XP est attribuée
 * uniquement par le serveur quand il valide une partie (voir Sudoku.controller).
 */
const GameStatsRoutes = Router();
const db = createDb(pool);
const repo = new GameStatsRepository(db);
const service = new GameStatsService(repo);
const controller = GameStatsController(service);

GameStatsRoutes.get("/user/:userId", controller.getStatsByUserId);

export default GameStatsRoutes;
