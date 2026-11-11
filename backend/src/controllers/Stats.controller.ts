import type {Request, Response} from "express";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import type {StatsRepository} from "../repository/Stats.repository.js";
import {parseStatsFilter} from "../utils/statsFilter.js";

const TIMELINE_DAYS = 30;
const TOP_PLAYERS = 50;

/*
 * Page Statistiques (administrateur uniquement, voir requireAdmin)
 * - all : tous les chiffres de la page en une requête, filtrés par ?de=…&a=…&jeu=… (voir statsFilter.ts) ;
 *   gameList : tous les jeux, pour le choix du filtre
 * - export : données brutes (parties, joueurs, victoires, défis), sans email ni mot de passe
 */
export function createStatsController(stats: StatsRepository) {
    return {
        all: asyncHandler(async (req: Request, res: Response) => {
            const f = parseStatsFilter(req.query);
            if (typeof f === "string") return void res.status(400).json({status: "error", message: f});
            const [overview, games, configs, timeline, rhythm, daily, levels, topPlayers, gameList] = await Promise.all([
                stats.overview(f),
                stats.perGame(f),
                stats.configs(f),
                stats.timeline(TIMELINE_DAYS, f),
                stats.rhythm(f),
                stats.dailyByDay(TIMELINE_DAYS, f),
                stats.levels(),
                stats.topPlayers(TOP_PLAYERS, f),
                stats.gameList(),
            ]);
            res.status(200).json({
                status: "ok",
                data: {generatedAt: new Date().toISOString(), overview, games, configs, timeline, rhythm, daily, levels, topPlayers, gameList},
            });
        }),

        export: asyncHandler(async (_req: Request, res: Response) => {
            res.status(200).json({status: "ok", data: await stats.exportAll()});
        }),
    };
}
