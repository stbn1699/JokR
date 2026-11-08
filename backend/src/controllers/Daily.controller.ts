import type {Request, Response} from "express";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import type {AuthLocals} from "../middleware/auth.js";
import {DAILY_GAMES, DAILY_REWARD_MULTIPLIER, type DailyGameCode, type DailyService, isDailyGame} from "../services/Daily.service.js";
import {dailyDate, nextDailyChange} from "../utils/dailyDate.js";
import {tracker} from "../services/tracker.js";
import {startPuzzle} from "../services/puzzleGames.js";
import {isDateKey, routeParam} from "../utils/validation.js";

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

/*
 * Défi du jour
 * - overview : défis du jour et, si le joueur est connecté, ses résultats ;
 *   nextInMs = temps avant le prochain changement de jour (le front se rafraîchit à ce moment-là), ready = défis déjà générés
 * - start : commence le défi (grille du jour) ; la partie se valide ensuite comme une partie normale
 * - leaderboard : meilleurs temps du jour (ou d'un jour passé, ?date=AAAA-MM-JJ) et place du joueur connecté
 * - history : défis d'un mois (?month=AAAA-MM, mois courant par défaut), aujourd'hui compris,
 *   et résultats du joueur connecté
 * - replay : rejoue le défi d'un jour passé ; c'est une partie normale (XP normale, hors classement du jour)
 */
export function createDailyController(service: DailyService, friendIds: (userId: string) => Promise<string[]> = async () => []) {
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
            const ready = await service.ready(date);
            res.status(200).json({status: "ok", data: {date, nextInMs: nextDailyChange().getTime() - Date.now(), ready, rewardMultiplier: DAILY_REWARD_MULTIPLIER, games}});
        }),

        start: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const code = gameParam(req);
            if (!code) {
                res.status(404).json({status: "error", message: "Pas de défi du jour pour ce jeu"});
                return;
            }

            const date = dailyDate();
            // mode admin : comme un invité, le défi se rejoue sans compter
            const userId = res.locals.ghost ? undefined : res.locals.userId;

            // Déjà réussi aujourd'hui : on ne relance pas (une seule réussite compte par jour)
            const done = userId ? await service.resultOf(code, date, userId) : null;
            if (done) {
                res.status(200).json({status: "ok", data: {date, alreadyDone: true, result: done}});
                return;
            }

            const challenge = await service.challenge(code, date);
            const {size, emptyCells} = DAILY_GAMES[code];
            const {gameId, grid} = startPuzzle(code, challenge.puzzle, date);
            tracker.started(req, {gameId, gameCode: code, mode: "daily", gridSize: size, emptyCells});
            res.status(200).json({status: "ok", data: {date, alreadyDone: false, gameId, grid, size, emptyCells}});
        }),

        history: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const today = dailyDate();
            const month = typeof req.query.month === "string" ? req.query.month : today.slice(0, 7);
            if (!MONTH_KEY.test(month) || month > today.slice(0, 7)) {
                res.status(400).json({status: "error", message: "Mois invalide"});
                return;
            }
            res.status(200).json({status: "ok", data: await service.month(month, today, res.locals.userId)});
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
            const {gameId, grid} = startPuzzle(code, challenge.puzzle);
            tracker.started(req, {gameId, gameCode: code, mode: "replay", gridSize: challenge.grid_size, emptyCells: challenge.empty_cells});
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
            // ?amis=1 : seulement le joueur connecté et ses amis
            const members = req.query.amis === "1" && userId ? [userId, ...await friendIds(userId)] : undefined;
            const [entries, me] = await Promise.all([
                service.leaderboard(code, date, 20, members),
                userId ? service.resultOf(code, date, userId) : Promise.resolve(null),
            ]);
            res.status(200).json({status: "ok", data: {date, nextInMs: nextDailyChange().getTime() - Date.now(), entries, me}});
        }),
    };
}
