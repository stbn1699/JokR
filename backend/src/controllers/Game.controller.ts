import type {Request, Response} from "express";
import {GamesService} from "../services/Games.service.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import type {Game} from "../models/Game.model.js";

/*
 * Contrôleur des jeux
 * Handlers exposés :
 * - list: retourne la liste complète des jeux disponibles
 * - getBaseXp: retourne la valeur base XP associée à un code de jeu
 *
 * Le service GamesService encapsule la logique métier / accès aux données.
 */
export function createGamesController(service: GamesService) {
    return {
        // Retourne tous les jeux
        list: asyncHandler(async (_req: Request, res: Response) => {
            // Appel au service pour récupérer les jeux (typé Game[])
            const games :Game[] = await service.listGames();
            res.status(200).json({status: "ok", data: games});
        }),

        // Retourne le "baseXp" d'un jeu identifié par son code
        getBaseXp: asyncHandler(async (req: Request, res: Response) => {
            const {gameCode} = req.params;

            // Validation simple du paramètre
            if (!gameCode) {
                res.status(400).json({status: "error", message: "gameCode parameter is required"});
                return;
            }

            // Le service peut renvoyer undefined si le jeu n'existe pas
            const baseXp: number | undefined = await service.getBaseXp(gameCode);

            // Réponse standardisée
            res.status(200).json({status: "ok", data: baseXp});
        })
    };
}
