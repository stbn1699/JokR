import {randomInt} from "node:crypto";
import type {Request, Response} from "express";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import type {AuthLocals} from "../middleware/auth.js";
import type {GamesService} from "../services/Games.service.js";
import type {ProgressionService} from "../services/Progression.service.js";
import {paturagesStore} from "../services/stores.js";
import {tracker} from "../services/tracker.js";
import type {DailyService} from "../services/Daily.service.js";
import {finishGridWin} from "../services/gridWin.js";
import {routeParam} from "../utils/validation.js";
import {wordSettings} from "../utils/words.js";
import {generatePaturages, isPaturagesSolution, PATURAGES_DEFAULT_SIZE, PATURAGES_SIZES, paturagesCredits, paturagesXp, type PaturagesPuzzle} from "../utils/paturages.js";

const GAME_CODE = "PATURAGES";

// Ce que le joueur reçoit : jamais la solution
const publicPuzzle = ({size, cows, given}: PaturagesPuzzle) => ({size, cows, given});

/*
 * Contrôleur Pâturages (partie libre)
 * - settings : tailles, carrés donnés et XP de chaque réglage
 * - generate { size, amount: carrés donnés }, games/:gameId pour reprendre une partie
 * - validate { gameId, squares } : le découpage du pré ; XP si le joueur est connecté
 */
export function createPaturagesController(progression: ProgressionService, games: GamesService, daily: DailyService) {
    return {
        settings: asyncHandler(async (_req: Request, res: Response) => {
            const baseXp = await games.getBaseXp(GAME_CODE) ?? 0;
            const data = wordSettings(PATURAGES_DEFAULT_SIZE, PATURAGES_SIZES, (size, given) => paturagesXp(baseXp, size, given), paturagesCredits);
            res.status(200).json({status: "ok", data});
        }),

        generate: asyncHandler(async (req: Request, res: Response) => {
            const {size, amount} = req.body ?? {};
            const limits = PATURAGES_SIZES.find(s => s.size === size);
            if (!limits || !Number.isInteger(amount) || amount < limits.min || amount > limits.max) {
                res.status(400).json({status: "error", message: "Réglages de partie non proposés"});
                return;
            }
            const puzzle = generatePaturages(size, amount, max => randomInt(max));
            const gameId = paturagesStore.create(puzzle, amount);
            tracker.started(req, {gameId, gameCode: GAME_CODE, mode: "free", gridSize: size, emptyCells: amount});
            res.status(200).json({status: "ok", data: {gameId, puzzle: publicPuzzle(puzzle)}});
        }),

        status: asyncHandler(async (req: Request, res: Response) => {
            const game = paturagesStore.get(routeParam(req.params, "gameId") ?? "");
            if (!game) {
                res.status(404).json({status: "error", message: "Partie introuvable ou expirée"});
                return;
            }
            res.status(200).json({status: "ok", data: {grid: publicPuzzle(game.puzzle), elapsedMs: Date.now() - game.createdAt}});
        }),

        validate: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const {gameId, squares} = req.body ?? {};
            if (typeof gameId !== "string") {
                res.status(400).json({status: "error", message: "La partie est obligatoire"});
                return;
            }
            const game = paturagesStore.get(gameId);
            if (!game) {
                res.status(404).json({status: "error", message: "Partie introuvable ou expirée, lance une nouvelle partie"});
                return;
            }
            if (!isPaturagesSolution(game.puzzle, squares)) {
                tracker.failed(gameId);
                res.status(400).json({status: "error", message: "Chaque vache doit avoir son carré, sans trou dans le pré"});
                return;
            }

            await finishGridWin(res, GAME_CODE, gameId, game, {progression, games, daily});
        }),
    };
}
