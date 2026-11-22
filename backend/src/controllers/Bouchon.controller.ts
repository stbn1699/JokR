import {randomInt} from "node:crypto";
import type {Request, Response} from "express";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import type {AuthLocals} from "../middleware/auth.js";
import type {GamesService} from "../services/Games.service.js";
import type {ProgressionService} from "../services/Progression.service.js";
import {bouchonStore} from "../services/stores.js";
import {tracker} from "../services/tracker.js";
import {routeParam} from "../utils/validation.js";
import {wordSettings} from "../utils/words.js";
import {BOUCHON_DEFAULT_SIZE, BOUCHON_SIZES, bouchonCredits, bouchonXp, generateBouchon, isBouchonSolution} from "../utils/bouchon.js";

const GAME_CODE = "BOUCHON";

/*
 * Contrôleur Bouchon (partie libre)
 * - settings : tailles, nombres de coups et XP de chaque réglage
 * - generate { size, amount: coups minimum }, games/:gameId pour reprendre une partie
 * - validate { gameId, moves } : les coups sont rejoués ; XP si le joueur est connecté
 */
export function createBouchonController(progression: ProgressionService, games: GamesService) {
    return {
        settings: asyncHandler(async (_req: Request, res: Response) => {
            const baseXp = await games.getBaseXp(GAME_CODE) ?? 0;
            const data = wordSettings(BOUCHON_DEFAULT_SIZE, BOUCHON_SIZES, (size, moves) => bouchonXp(baseXp, size, moves), bouchonCredits);
            res.status(200).json({status: "ok", data});
        }),

        generate: asyncHandler(async (req: Request, res: Response) => {
            const {size, amount} = req.body ?? {};
            const limits = BOUCHON_SIZES.find(s => s.size === size);
            if (!limits || !Number.isInteger(amount) || amount < limits.min || amount > limits.max) {
                res.status(400).json({status: "error", message: "Réglages de partie non proposés"});
                return;
            }
            const puzzle = generateBouchon(size, amount, max => randomInt(max));
            const gameId = bouchonStore.create(puzzle, amount);
            tracker.started(req, {gameId, gameCode: GAME_CODE, mode: "free", gridSize: size, emptyCells: amount});
            res.status(200).json({status: "ok", data: {gameId, puzzle}});
        }),

        status: asyncHandler(async (req: Request, res: Response) => {
            const game = bouchonStore.get(routeParam(req.params, "gameId") ?? "");
            if (!game) {
                res.status(404).json({status: "error", message: "Partie introuvable ou expirée"});
                return;
            }
            res.status(200).json({status: "ok", data: {grid: game.puzzle, elapsedMs: Date.now() - game.createdAt}});
        }),

        validate: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const {gameId, moves} = req.body ?? {};
            if (typeof gameId !== "string") {
                res.status(400).json({status: "error", message: "La partie est obligatoire"});
                return;
            }
            const game = bouchonStore.get(gameId);
            if (!game) {
                res.status(404).json({status: "error", message: "Partie introuvable ou expirée, lance une nouvelle partie"});
                return;
            }
            if (!isBouchonSolution(game.puzzle, moves)) {
                tracker.failed(gameId);
                res.status(400).json({status: "error", message: "Le taxi n'a pas atteint la sortie"});
                return;
            }

            // Partie terminée : on la retire tout de suite pour empêcher une double validation
            bouchonStore.delete(gameId);
            const durationMs = Date.now() - game.createdAt;
            const userId = res.locals.userId;
            tracker.finished(gameId, durationMs, userId);
            if (!userId) {
                res.status(200).json({status: "ok", data: {xp: undefined, durationMs}});
                return;
            }
            const {size} = game.puzzle;
            const count = game.cluesCount;
            const baseXp = await games.getBaseXp(GAME_CODE) ?? 0;
            const xp = bouchonXp(baseXp, size, count);
            const credits = bouchonCredits(size, count);
            const {personalBest} = await progression.recordWin(userId, GAME_CODE, xp, {gridSize: size, emptyCells: count, durationMs}, credits);
            res.status(200).json({status: "ok", data: {xp, credits, rewardMultiplier: 1, durationMs, personalBest}});
        }),
    };
}
