import type { NextFunction, Request, Response } from "express";
import { GamesService } from "./games.service.js";

export function createGamesController(service: GamesService) {
	return {
		list: async (_req: Request, res: Response, next: NextFunction) => {
			try {
				const games = await service.listGames();
				res.status(200).json({status: "ok", data: games});
			} catch (err) {
				next(err);
			}
		}
	};
}
