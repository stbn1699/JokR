import type {Request, Response} from "express";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import type {AuthLocals} from "../middleware/auth.js";
import {DAILY_GAMES, type DailyGameCode, type DailyService, isDailyGame} from "../services/Daily.service.js";
import {countClues} from "../services/Sudoku.service.js";
import {toApiGrid} from "../services/Binero.service.js";
import {type BineroGrid, countBineroClues} from "../utils/binero.js";
import {sudokuStore, bineroStore} from "../services/stores.js";
import {dailyDate} from "../utils/dailyDate.js";
import {routeParam} from "../utils/validation.js";

/*
 * Défi du jour
 * - overview : défis du jour et, si le joueur est connecté, ses résultats
 * - start : commence le défi (grille du jour) ; la partie se valide ensuite comme une partie normale
 * - leaderboard : meilleurs temps du jour et place du joueur connecté
 */
export function createDailyController(service: DailyService) {
    const gameParam = (req: Request): DailyGameCode | null => {
        const code = routeParam(req.params, "game")?.toUpperCase() ?? "";
        return isDailyGame(code) ? code : null;
    };

    return {
        overview: asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
            const date = dailyDate();
            const userId = res.locals.userId;
            const games = await Promise.all((Object.keys(DAILY_GAMES) as DailyGameCode[]).map(async code => ({
                code,
                ...DAILY_GAMES[code],
                result: userId ? await service.resultOf(code, date, userId) : null,
            })));
            res.status(200).json({status: "ok", data: {date, games}});
        }),

        start: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const code = gameParam(req);
            if (!code) {
                res.status(404).json({status: "error", message: "Pas de défi du jour pour ce jeu"});
                return;
            }

            const date = dailyDate();
            const userId = res.locals.userId;

            // Déjà réussi aujourd'hui : on ne relance pas (une seule réussite compte par jour)
            const done = userId ? await service.resultOf(code, date, userId) : null;
            if (done) {
                res.status(200).json({status: "ok", data: {date, alreadyDone: true, result: done}});
                return;
            }

            const challenge = await service.challenge(code, date);
            const {size, emptyCells} = DAILY_GAMES[code];

            if (code === "SUDOKU") {
                const puzzle = challenge.puzzle as number[][];
                const gameId = sudokuStore.create(puzzle, countClues(puzzle), {daily: date});
                res.status(200).json({status: "ok", data: {date, alreadyDone: false, gameId, grid: puzzle, size, emptyCells}});
            } else {
                const puzzle = challenge.puzzle as BineroGrid;
                const gameId = bineroStore.create(puzzle, countBineroClues(puzzle), {daily: date});
                res.status(200).json({status: "ok", data: {date, alreadyDone: false, gameId, grid: toApiGrid(puzzle), size, emptyCells}});
            }
        }),

        leaderboard: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const code = gameParam(req);
            if (!code) {
                res.status(404).json({status: "error", message: "Pas de défi du jour pour ce jeu"});
                return;
            }
            const date = dailyDate();
            const userId = res.locals.userId;
            const [entries, me] = await Promise.all([
                service.leaderboard(code, date),
                userId ? service.resultOf(code, date, userId) : Promise.resolve(null),
            ]);
            res.status(200).json({status: "ok", data: {date, entries, me}});
        }),
    };
}
