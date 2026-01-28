import type {Request, Response} from "express";
import type {GameStatsService} from "../services/GameStats.service.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import type {GameStats} from "../models/GameStats.model.js";

export function GameStatsController(service: GameStatsService) {
    return {
        gameWin: asyncHandler(async (req: Request, res: Response) => {
            const {user_id, game_code} = req.body ?? {};

            if (!user_id || !game_code) {
                res.status(400).json({status: "error", message: "user_id and game_code are required"});
                return;
            }

            await service.gameWin(user_id, game_code);

            res.status(200).json({status: "ok"});
        }),

        getStatsByUserId: asyncHandler(async (req: Request, res: Response) :Promise<GameStats[] | void> => {
            const {userId} = req.params;

            if (!userId) {
                res.status(400).json({status: "error", message: "userId parameter is required"});
                return;
            }

            const games :GameStats[] = await service.getStatsByUserId(userId);
            res.status(200).json({status: "ok", data: games});
        })
    };
}
