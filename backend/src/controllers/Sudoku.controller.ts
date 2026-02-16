import type {Request, Response} from "express";
import {SudokuService} from "../services/Sudoku.service.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import type {GameStatsService} from "../services/GameStats.service.js";
import type {UsersService} from "../services/Users.service.js";

export function createSudokuController(service: SudokuService, gameStatsService?: GameStatsService, usersService?: UsersService) {
    return {
        generate: asyncHandler(async (req: Request, res: Response) => {

            const {cluesCount} = req.body ?? {};
            const numPlaced = Number.isInteger(cluesCount) ? Number(cluesCount) : undefined;

            // validation
            if (numPlaced === undefined || isNaN(numPlaced)) {
                res.status(400).json({status: "error", message: "cluesCount must be an integer"});
                return;
            }
            if (numPlaced < 0 || numPlaced > 81) {
                res.status(400).json({status: "error", message: "cluesCount must be between 0 and 81"});
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
                res.status(503).json({status: 'error', message: 'Generation timed out or failed'});
                return;
            }

            res.status(200).json({status: "ok", data: {grid}});
        }),

        // Validate a completed grid. Body expected: { grid: number[][], user_id?: string, game_code?: string, xp?: number }
        validate: asyncHandler(async (req: Request, res: Response) => {
            const {grid, user_id, game_code, xp} = req.body ?? {};

            if (!grid) {
                res.status(400).json({status: 'error', message: 'grid is required'});
                return;
            }

            const valid = service.validate(grid);
            if (!valid) {
                res.status(400).json({status: 'error', message: 'Invalid Sudoku grid'});
                return;
            }

            // If user info provided, record the win
            if (user_id) {
                // xp must be provided to update stats; otherwise we can't compute it server-side here
                if (typeof xp !== 'number' || Number.isNaN(xp)) {
                    res.status(400).json({
                        status: 'error',
                        message: 'xp (number) is required to record win for a user'
                    });
                    return;
                }

                if (!gameStatsService || !usersService) {
                    console.warn('[Sudoku] services for recording game win not available');
                    // still return success for validation but don't record
                    res.status(200).json({
                        status: 'ok',
                        message: 'valid, but win not recorded (server not configured)'
                    });
                    return;
                }

                // record win in game stats and update user XP
                await gameStatsService.gameWin(user_id, game_code ?? 'SUDOKU', xp);
                await usersService.updateUserXpAndLevel(user_id, xp);
            }

            res.status(200).json({status: 'ok'});
        })
    };
}
