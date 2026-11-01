import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {SudokuService} from "../services/Sudoku.service.js";
import {createSudokuController} from "../controllers/Sudoku.controller.js";
import {GameStatsRepository} from "../repository/GameStats.repository.js";
import {GameStatsService} from "../services/GameStats.service.js";
import {UsersRepository} from "../repository/Users.repository.js";
import {UsersService} from "../services/Users.service.js";
import {GamesRepository} from "../repository/Games.repository.js";
import {GamesService} from "../services/Games.service.js";
import {SudokuGameStore} from "../services/SudokuGameStore.js";
import {optionalAuth} from "../middleware/auth.js";

const router = Router();
const db = createDb(pool);
const service = new SudokuService();
const store = new SudokuGameStore();

// services utilisés pour enregistrer les victoires à la validation
const gameStatsRepo = new GameStatsRepository(db);
const gameStatsService = new GameStatsService(gameStatsRepo);
const usersRepo = new UsersRepository(db);
const usersService = new UsersService(usersRepo);

// games service needed to get baseXp to compute XP server-side
const gamesRepo = new GamesRepository(db);
const gamesService = new GamesService(gamesRepo);

const controller = createSudokuController(service, store, gameStatsService, usersService, gamesService);

// POST /sudoku/generateSudoku
router.post("/generateSudoku", controller.generate);
// POST /sudoku/validateSudoku (connecté = XP enregistrée, invité = simple vérification)
router.post("/validateSudoku", optionalAuth, controller.validate);

export default router;
