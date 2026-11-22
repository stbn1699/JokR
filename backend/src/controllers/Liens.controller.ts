import {randomInt} from "node:crypto";
import type {Request, Response} from "express";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import type {AuthLocals} from "../middleware/auth.js";
import type {GamesService} from "../services/Games.service.js";
import type {ProgressionService} from "../services/Progression.service.js";
import {liensStore} from "../services/stores.js";
import {tracker} from "../services/tracker.js";
import {routeParam} from "../utils/validation.js";
import {wordSettings} from "../utils/words.js";
import {generateLiens, isLiensSolution, LIENS_DEFAULT_SIZE, LIENS_SIZES, liensCredits, liensXp, type LiensPuzzle} from "../utils/liens.js";

const GAME_CODE = "LIENS";

// Ce que le joueur reçoit : jamais la solution
const publicPuzzle = ({size, pairs}: LiensPuzzle) => ({size, pairs});

/*
 * Contrôleur Liens (partie libre)
 * - settings : tailles, nombres de paires et XP de chaque réglage
 * - generate { size, amount: paires }, games/:gameId pour reprendre une partie
 * - validate { gameId, paths } : la ligne de chaque paire ; XP si le joueur est connecté
 */
export function createLiensController(progression: ProgressionService, games: GamesService) {
    return {
        settings: asyncHandler(async (_req: Request, res: Response) => {
            const baseXp = await games.getBaseXp(GAME_CODE) ?? 0;
            const data = wordSettings(LIENS_DEFAULT_SIZE, LIENS_SIZES, (size, count) => liensXp(baseXp, size, count), liensCredits);
            res.status(200).json({status: "ok", data});
        }),

        generate: asyncHandler(async (req: Request, res: Response) => {
            const {size, amount} = req.body ?? {};
            const limits = LIENS_SIZES.find(s => s.size === size);
            if (!limits || !Number.isInteger(amount) || amount < limits.min || amount > limits.max) {
                res.status(400).json({status: "error", message: "Réglages de partie non proposés"});
                return;
            }
            const puzzle = generateLiens(size, amount, max => randomInt(max));
            const gameId = liensStore.create(puzzle, amount);
            tracker.started(req, {gameId, gameCode: GAME_CODE, mode: "free", gridSize: size, emptyCells: amount});
            res.status(200).json({status: "ok", data: {gameId, puzzle: publicPuzzle(puzzle)}});
        }),

        status: asyncHandler(async (req: Request, res: Response) => {
            const game = liensStore.get(routeParam(req.params, "gameId") ?? "");
            if (!game) {
                res.status(404).json({status: "error", message: "Partie introuvable ou expirée"});
                return;
            }
            res.status(200).json({status: "ok", data: {grid: publicPuzzle(game.puzzle), elapsedMs: Date.now() - game.createdAt}});
        }),

        validate: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const {gameId, paths} = req.body ?? {};
            if (typeof gameId !== "string") {
                res.status(400).json({status: "error", message: "La partie est obligatoire"});
                return;
            }
            const game = liensStore.get(gameId);
            if (!game) {
                res.status(404).json({status: "error", message: "Partie introuvable ou expirée, lance une nouvelle partie"});
                return;
            }
            if (!isLiensSolution(game.puzzle, paths)) {
                tracker.failed(gameId);
                res.status(400).json({status: "error", message: "Relie toutes les paires et remplis toute la grille"});
                return;
            }

            // Partie terminée : on la retire tout de suite pour empêcher une double validation
            liensStore.delete(gameId);
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
            const xp = liensXp(baseXp, size, count);
            const credits = liensCredits(size, count);
            const {personalBest} = await progression.recordWin(userId, GAME_CODE, xp, {gridSize: size, emptyCells: count, durationMs}, credits);
            res.status(200).json({status: "ok", data: {xp, credits, rewardMultiplier: 1, durationMs, personalBest}});
        }),
    };
}
