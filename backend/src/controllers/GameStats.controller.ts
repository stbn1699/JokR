import type {Request, Response} from "express";
import type {GameStatsService} from "../services/GameStats.service.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import type {GameStats} from "../models/GameStats.model.js";
import type {UsersService} from "../services/Users.service.js";

/*
 * Contrôleur des statistiques de jeux
 * Handlers :
 * - gameWin: appelé lorsqu'un utilisateur gagne une partie; met à jour les stats et le XP de l'utilisateur
 * - getStatsByUserId: récupère les statistiques de jeux pour un utilisateur donné
 *
 * Note : la logique réelle de mise à jour est déléguée aux services injectés.
 */
export function GameStatsController(gameStatsService: GameStatsService, usersService: UsersService) {
    return {
        // Signale une victoire de jeu pour un utilisateur
        gameWin: asyncHandler(async (req: Request, res: Response) => {
            // Attendu dans le body : { user_id, game_code, game_xp }
            const {user_id, game_code, game_xp} = req.body ?? {};

            // Validation minimale
            if (!user_id || !game_code) {
                res.status(400).json({status: "error", message: "user_id and game_code are required"});
                return;
            }

            // Mise à jour des statistiques du jeu
            await gameStatsService.gameWin(user_id, game_code, game_xp);

            // Mise à jour du XP / level de l'utilisateur (effet secondaire important)
            // Le service UsersService encapsule la logique d'incrémentation et de montée en niveau
            await usersService.updateUserXpAndLevel(user_id, game_xp);

            res.status(200).json({status: "ok"});
        }),

        // Récupère les statistiques de jeu pour un utilisateur spécifique
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
