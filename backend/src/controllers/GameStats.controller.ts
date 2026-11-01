import type {Request, Response} from "express";
import type {GameStatsService} from "../services/GameStats.service.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import type {GameStats} from "../models/GameStats.model.js";
import {isUuid} from "../utils/validation.js";

/*
 * Contrôleur des statistiques de jeux
 * - getStatsByUserId: récupère les statistiques de jeux pour un utilisateur donné
 *
 * Les victoires sont enregistrées par le contrôleur de chaque jeu après validation serveur.
 */
export function GameStatsController(gameStatsService: GameStatsService) {
    return {
        getStatsByUserId: asyncHandler(async (req: Request, res: Response) => {
            const {userId} = req.params;

            if (!userId || !isUuid(userId)) {
                res.status(400).json({status: "error", message: "Invalid userId"});
                return;
            }

            const games: GameStats[] = await gameStatsService.getStatsByUserId(userId);
            res.status(200).json({status: "ok", data: games});
        })
    };
}
