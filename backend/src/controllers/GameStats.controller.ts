import type {NextFunction, Request, Response} from "express";
import type {GameStatsService} from "../services/GameStats.service.js";

export function GameStatsController(service: GameStatsService) {
    return {
        gameWin: async (_req: Request, res: Response, next: NextFunction) => {
            try {
                const games = await service.gameWin(_req.body.user_id, _req.body.game_id);
                res.status(200).json({status: "ok", data: games});
            } catch (err) {
                next(err);
            }
        },

        getStatsByUserId: async (_req: Request<{userId: string}>, res: Response, next: NextFunction) => {
            try {
                const { userId } = _req.params;
                if (!userId) {
                    res.status(400).json({status: "error", message: "userId parameter is required"});
                    return;
                }
                const games = await service.getStatsByUserId(userId);
                res.status(200).json({status: "ok", data: games});
            } catch (err) {
                next(err);
            }
        }
    };
}
