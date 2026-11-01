import {Router} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {SudokuService} from "../services/Sudoku.service.js";
import {createSudokuController} from "../controllers/Sudoku.controller.js";
import {GamesRepository} from "../repository/Games.repository.js";
import {GamesService} from "../services/Games.service.js";
import {PuzzleStore} from "../services/PuzzleStore.js";
import {ProgressionService} from "../services/Progression.service.js";
import {optionalAuth} from "../middleware/auth.js";

const router = Router();
const db = createDb(pool);
const service = new SudokuService();
const store = new PuzzleStore<number[][]>();

// enregistre les victoires (stats du jeu + XP du joueur) dans une transaction
const progressionService = new ProgressionService(db);

// games service needed to get baseXp to compute XP server-side
const gamesService = new GamesService(new GamesRepository(db));

const controller = createSudokuController(service, store, progressionService, gamesService);

// GET /sudoku/settings (plage de cases vides et XP associée)
router.get("/settings", controller.settings);
// POST /sudoku/generateSudoku
router.post("/generateSudoku", controller.generate);
// POST /sudoku/validateSudoku (connecté = XP enregistrée, invité = simple vérification)
router.post("/validateSudoku", optionalAuth, controller.validate);

export default router;
