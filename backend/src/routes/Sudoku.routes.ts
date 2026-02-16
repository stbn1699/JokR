import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {SudokuService} from "../services/Sudoku.service.js";
import {createSudokuController} from "../controllers/Sudoku.controller.js";
import {GameStatsRepository} from "../repository/GameStats.repository.js";
import {GameStatsService} from "../services/GameStats.service.js";
import {UsersRepository} from "../repository/Users.repository.js";
import {UsersService} from "../services/Users.service.js";

const router = Router();
const db = createDb(pool);
const service = new SudokuService();

// optional: services used to record wins on validation
const gameStatsRepo = new GameStatsRepository(db);
const gameStatsService = new GameStatsService(gameStatsRepo);
const usersRepo = new UsersRepository(db);
const usersService = new UsersService(usersRepo);

const controller = createSudokuController(service, gameStatsService, usersService);

// POST /games/generateSudoku
router.post("/generateSudoku", controller.generate);
// POST /games/validateSudoku
router.post("/validateSudoku", controller.validate);

export default router;
