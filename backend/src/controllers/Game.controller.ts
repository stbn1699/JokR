import type {Request, Response} from "express";
import {GamesService} from "../services/Games.service.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import type {Game} from "../models/Game.model.js";

export function createGamesController(service: GamesService) {
    return {
        list: asyncHandler(async (_req: Request, res: Response) => {
            const games :Game[] = await service.listGames();
            res.status(200).json({status: "ok", data: games});
        }),

        getBaseXp: asyncHandler(async (req: Request, res: Response) => {
            const {gameCode} = req.params;

            if (!gameCode) {
                res.status(400).json({status: "error", message: "gameCode parameter is required"});
                return;
            }

            const baseXp: number | undefined = await service.getBaseXp(gameCode);
            res.status(200).json({status: "ok", data: baseXp});
        })
    };
}
