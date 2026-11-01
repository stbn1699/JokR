import type {Request, Response} from "express";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import type {AuthLocals} from "../middleware/auth.js";
import {DAILY_GAMES, type DailyGameCode, type DailyService, isDailyGame} from "../services/Daily.service.js";
import {countClues} from "../services/Sudoku.service.js";
import {toApiGrid} from "../services/Binero.service.js";
import {type BineroGrid, countBineroClues} from "../utils/binero.js";
import {sudokuStore, bineroStore} from "../services/stores.js";
import {dailyDate} from "../utils/dailyDate.js";
import {isDateKey, routeParam} from "../utils/validation.js";

// Nombre de jours affichés dans l'historique des défis
const HISTORY_DAYS = 30;

/*
 * Défi du jour
 * - overview : défis du jour et, si le joueur est connecté, ses résultats
 * - start : commence le défi (grille du jour) ; la partie se valide ensuite comme une partie normale
 * - leaderboard : meilleurs temps du jour (ou d'un jour passé, ?date=AAAA-MM-JJ) et place du joueur connecté
 * - history : défis des jours précédents (et résultats du joueur connecté)
 * - replay : rejoue le défi d'un jour passé ; c'est une partie normale (XP normale, hors classement du jour)
 */
export function createDailyController(service: DailyService) {
    const gameParam = (req: Request): DailyGameCode | null => {
        const code = routeParam(req.params, "game")?.toUpperCase() ?? "";
        return isDailyGame(code) ? code : null;
    };

    // Grille d'un défi rangée dans la mémoire du jeu ; `daily` = date si la partie compte pour le classement
    const createGame = (code: DailyGameCode, puzzle: unknown, daily?: string) => {
        if (code === "SUDOKU") {
            const grid = puzzle as number[][];
            const options = daily ? {daily} : {};
            return {gameId: sudokuStore.create(grid, countClues(grid), options), grid};
        }
        const grid = puzzle as BineroGrid;
        const options = daily ? {daily} : {};
        return {gameId: bineroStore.create(grid, countBineroClues(grid), options), grid: toApiGrid(grid)};
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
            const {gameId, grid} = createGame(code, challenge.puzzle, date);
            res.status(200).json({status: "ok", data: {date, alreadyDone: false, gameId, grid, size, emptyCells}});
        }),

        history: asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
            const days = await service.history(dailyDate(), HISTORY_DAYS, res.locals.userId);
            res.status(200).json({status: "ok", data: days});
        }),

        replay: asyncHandler(async (req: Request, res: Response) => {
            const code = gameParam(req);
            const date = routeParam(req.params, "date") ?? "";
            if (!code || !isDateKey(date)) {
                res.status(404).json({status: "error", message: "Défi introuvable"});
                return;
            }
            if (date >= dailyDate()) {
                res.status(400).json({status: "error", message: "Le défi d'aujourd'hui se joue depuis la page du défi du jour"});
                return;
            }
            const challenge = await service.pastChallenge(code, date);
            if (!challenge) {
                res.status(404).json({status: "error", message: "Pas de défi ce jour-là"});
                return;
            }
            // Pas de date "daily" : la validation la traite comme une partie normale
            const {gameId, grid} = createGame(code, challenge.puzzle);
            res.status(200).json({
                status: "ok",
                data: {date, gameId, grid, size: challenge.grid_size, emptyCells: challenge.empty_cells},
            });
        }),

        leaderboard: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const code = gameParam(req);
            if (!code) {
                res.status(404).json({status: "error", message: "Pas de défi du jour pour ce jeu"});
                return;
            }
            // Jour demandé (?date=AAAA-MM-JJ, passé ou aujourd'hui), aujourd'hui par défaut
            const today = dailyDate();
            const requested = typeof req.query.date === "string" ? req.query.date : today;
            if (!isDateKey(requested) || requested > today) {
                res.status(400).json({status: "error", message: "Date invalide"});
                return;
            }
            const date = requested;
            const userId = res.locals.userId;
            const [entries, me] = await Promise.all([
                service.leaderboard(code, date),
                userId ? service.resultOf(code, date, userId) : Promise.resolve(null),
            ]);
            res.status(200).json({status: "ok", data: {date, entries, me}});
        }),
    };
}
