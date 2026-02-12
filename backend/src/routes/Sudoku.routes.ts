import { Router } from "express";
import { SudokuService } from "../services/Sudoku.service.js";
import { createSudokuController } from "../controllers/Sudoku.controller.js";

const router = Router();
const service = new SudokuService();
const controller = createSudokuController(service);

// POST /games/generateSudoku
router.post("/generateSudoku", controller.generate);

export default router;
