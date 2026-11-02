import type {Request, Response} from "express";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import type {StatsRepository} from "../repository/Stats.repository.js";

const TIMELINE_DAYS = 30;
const TOP_PLAYERS = 50;

/*
 * Page Statistiques (administrateur uniquement, voir requireAdmin)
 * - all : tous les chiffres de la page en une requête
 * - export : données brutes (parties, joueurs, victoires, défis), sans email ni mot de passe
 */
export function createStatsController(stats: StatsRepository) {
    return {
        all: asyncHandler(async (_req: Request, res: Response) => {
            const [overview, games, configs, timeline, rhythm, daily, levels, topPlayers] = await Promise.all([
                stats.overview(),
                stats.perGame(),
                stats.configs(),
                stats.timeline(TIMELINE_DAYS),
                stats.rhythm(),
                stats.dailyByDay(TIMELINE_DAYS),
                stats.levels(),
                stats.topPlayers(TOP_PLAYERS),
            ]);
            res.status(200).json({
                status: "ok",
                data: {generatedAt: new Date().toISOString(), overview, games, configs, timeline, rhythm, daily, levels, topPlayers},
            });
        }),

        export: asyncHandler(async (_req: Request, res: Response) => {
            res.status(200).json({status: "ok", data: await stats.exportAll()});
        }),
    };
}
