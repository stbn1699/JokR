import type {Request, Response} from "express";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import type {AuthLocals} from "../middleware/auth.js";
import type {LeaderboardRepository} from "../repository/Leaderboard.repository.js";
import type {GamesService} from "../services/Games.service.js";
import {routeParam} from "../utils/validation.js";

const TOP = 20;

/*
 * Classements (20 premiers) + place du joueur connecté, même s'il n'est pas dans le top
 * - xp : niveau / XP globale
 * - credits : crédits du joueur (ceux qu'il a, pas ceux gagnés au total)
 * - game : niveau / XP sur un jeu
 */
export function createLeaderboardController(repo: LeaderboardRepository, games: GamesService) {
    const withRank = <T>(rows: T[]) => rows.map((row, i) => ({rank: i + 1, ...row}));

    return {
        xp: asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
            const userId = res.locals.userId;
            const [entries, me] = await Promise.all([
                repo.topXp(TOP),
                userId ? repo.xpRankOf(userId) : Promise.resolve(null),
            ]);
            res.status(200).json({status: "ok", data: {entries: withRank(entries), me}});
        }),

        credits: asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
            const userId = res.locals.userId;
            const [entries, me] = await Promise.all([
                repo.topCredits(TOP),
                userId ? repo.creditsRankOf(userId) : Promise.resolve(null),
            ]);
            res.status(200).json({status: "ok", data: {entries: withRank(entries), me}});
        }),

        game: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const code = routeParam(req.params, "game")?.toUpperCase() ?? "";
            if (await games.getBaseXp(code) === undefined) {
                res.status(404).json({status: "error", message: "Jeu inconnu"});
                return;
            }
            const userId = res.locals.userId;
            const [entries, me] = await Promise.all([
                repo.topGame(code, TOP),
                userId ? repo.gameRankOf(userId, code) : Promise.resolve(null),
            ]);
            res.status(200).json({status: "ok", data: {entries: withRank(entries), me}});
        }),
    };
}
