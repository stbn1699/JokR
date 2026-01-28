import type {Request, Response} from "express";
import type {GameStatsService} from "../services/GameStats.service.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import type {GameStats} from "../models/GameStats.model.js";
import type {UsersService} from "../services/Users.service.js";

export function GameStatsController(gameStatsService: GameStatsService, usersService: UsersService) {
    return {
        gameWin: asyncHandler(async (req: Request, res: Response) => {
            const {user_id, game_code, game_xp} = req.body ?? {};

            if (!user_id || !game_code) {
                res.status(400).json({status: "error", message: "user_id and game_code are required"});
                return;
            }

            await gameStatsService.gameWin(user_id, game_code, game_xp);
            await usersService.updateUserXpAndLevel(user_id, game_xp);

            res.status(200).json({status: "ok"});
        }),

        getStatsByUserId: asyncHandler(async (req: Request, res: Response): Promise<GameStats[] | void> => {
            const {userId} = req.params;

            if (!userId) {
                res.status(400).json({status: "error", message: "userId parameter is required"});
                return;
            }

            const games: GameStats[] = await gameStatsService.getStatsByUserId(userId);
            res.status(200).json({status: "ok", data: games});
        })
    };
}
