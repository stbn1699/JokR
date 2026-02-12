import type { Request, Response } from "express";
import { SudokuService } from "../services/Sudoku.service.js";
import { asyncHandler } from "../AsyncRouteHandlerMiddleware.js";

export function createSudokuController(service: SudokuService) {
    return {
        generate: asyncHandler(async (req: Request, res: Response) => {

            const { cluesCount } = req.body ?? {};
            const numPlaced = Number.isInteger(cluesCount) ? Number(cluesCount) : undefined;

            // validation
            if (numPlaced === undefined || isNaN(numPlaced)) {
                res.status(400).json({ status: "error", message: "cluesCount must be an integer" });
                return;
            }
            if (numPlaced < 0 || numPlaced > 81) {
                res.status(400).json({ status: "error", message: "cluesCount must be between 0 and 81" });
                return;
            }

            // call service with timeout
            const genPromise = service.generate(numPlaced);
            const timeoutMs = 15000; // 15s
            const timeoutPromise = new Promise<never>((_res, rej) => setTimeout(() => rej(new Error('generation timeout')), timeoutMs));

            let grid: number[][];
            try {
                grid = await Promise.race([genPromise, timeoutPromise]);
            } catch (err) {
                console.error('[Sudoku] generation error or timeout', err);
                res.status(503).json({ status: 'error', message: 'Generation timed out or failed' });
                return;
            }

            res.status(200).json({ status: "ok", data: { grid } });
        })
    };
}
