import type {Request, Response} from "express";
import {SudokuService} from "../services/Sudoku.service.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import type {GameStatsService} from "../services/GameStats.service.js";
import type {UsersService} from "../services/Users.service.js";
import type {GamesService} from "../services/Games.service.js";

export function createSudokuController(service: SudokuService, gameStatsService?: GameStatsService, usersService?: UsersService, gamesService?: GamesService) {
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

        // Validate a completed grid. Body expected: { grid: number[][], user_id?: string, game_code?: string, cluesCount?: number }
        validate: asyncHandler(async (req: Request, res: Response) => {
            const {grid, user_id, game_code, cluesCount} = req.body ?? {};

            if (!grid) {
                res.status(400).json({status: 'error', message: 'grid is required'});
                return;
            }

            const valid = service.validate(grid);
            if (!valid) {
                res.status(400).json({status: 'error', message: 'Invalid Sudoku grid'});
                return;
            }

            // default game code
            const gameCode = game_code ?? 'SUDOKU';

            // compute xp server-side if user provided
            let xpAwarded: number | undefined = undefined;
            if (user_id) {
                // Need cluesCount to compute xp; accept if provided and valid
                const clues = Number.isInteger(cluesCount) ? Number(cluesCount) : undefined;
                if (clues === undefined || clues <= 0 || clues > 81) {
                    res.status(400).json({status: 'error', message: 'cluesCount (integer 1..81) is required to compute XP'});
                    return;
                }

                if (!gamesService) {
                    console.warn('[Sudoku] gamesService not available to compute XP');
                    res.status(200).json({status: 'ok', message: 'valid, but xp not computed (server not configured)'});
                    return;
                }

                // récupère base XP
                const baseXp = await gamesService.getBaseXp(gameCode) ?? 0;

                // Calcul de l'XP centralisé (même formule que client)
                const referenceClues = 40;
                const exponent = 1.1;
                let xp = Math.round(baseXp * Math.pow(referenceClues / clues, exponent));
                xp = Math.max(20, Math.min(xp, 300));

                xpAwarded = xp;

                // record win via services existants
                if (gameStatsService && usersService) {
                    await gameStatsService.gameWin(user_id, gameCode, xp);
                    await usersService.updateUserXpAndLevel(user_id, xp);
                } else {
                    console.warn('[Sudoku] gameStatsService or usersService not available to record win');
                }
            }

            res.status(200).json({status: 'ok', data: {xp: xpAwarded}});
        })
    };
}
