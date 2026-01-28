import type {Request, Response} from "express";
import type {GameStatsService} from "../services/GameStats.service.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";

export function GameStatsController(service: GameStatsService) {
    return {
        gameWin: asyncHandler(async (req: Request, res: Response) => {
            const {user_id, game_id} = req.body ?? {};

            if (!user_id || !game_id) {
                res.status(400).json({status: "error", message: "user_id and game_id are required"});
                return;
            }

            const games = await service.gameWin(user_id, game_id);
            res.status(200).json({status: "ok", data: games});
        }),

        getStatsByUserId: asyncHandler(async (req: Request, res: Response) => {
            const {userId} = req.params;

            if (!userId) {
                res.status(400).json({status: "error", message: "userId parameter is required"});
                return;
            }

            const games = await service.getStatsByUserId(userId);
            res.status(200).json({status: "ok", data: games});
        })
    };
}
