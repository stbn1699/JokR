import {randomInt} from "node:crypto";
import type {Request, Response} from "express";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import type {AuthLocals} from "../middleware/auth.js";
import type {GamesService} from "../services/Games.service.js";
import type {ProgressionService} from "../services/Progression.service.js";
import {coloriaStore} from "../services/stores.js";
import {tracker} from "../services/tracker.js";
import {routeParam} from "../utils/validation.js";
import {wordSettings} from "../utils/words.js";
import {COLORIA_DEFAULT_ZONES, COLORIA_SIZES, coloriaCredits, coloriaXp, generateColoria, isColoriaSolution, type ColoriaPuzzle} from "../utils/coloria.js";

const GAME_CODE = "COLORIA";

// Ce que le joueur reçoit : jamais la solution
const publicPuzzle = ({width, zones, colors, regions, given}: ColoriaPuzzle) => ({width, zones, colors, regions, given});

/*
 * Contrôleur Coloria (partie libre)
 * - settings : nombres de zones et de couleurs proposés, avec l'XP de chacun
 * - generate { size: zones, amount: couleurs }, games/:gameId pour reprendre une partie
 * - validate { gameId, colors } : couleur de chaque zone ; XP si le joueur est connecté
 */
export function createColoriaController(progression: ProgressionService, games: GamesService) {
    return {
        settings: asyncHandler(async (_req: Request, res: Response) => {
            const baseXp = await games.getBaseXp(GAME_CODE) ?? 0;
            const data = wordSettings(COLORIA_DEFAULT_ZONES, COLORIA_SIZES, (zones, k) => coloriaXp(baseXp, zones, k), coloriaCredits);
            res.status(200).json({status: "ok", data});
        }),

        generate: asyncHandler(async (req: Request, res: Response) => {
            const {size, amount} = req.body ?? {};
            const limits = COLORIA_SIZES.find(s => s.size === size);
            if (!limits || !Number.isInteger(amount) || amount < limits.min || amount > limits.max) {
                res.status(400).json({status: "error", message: "Réglages de partie non proposés"});
                return;
            }
            const puzzle = generateColoria(size, amount, max => randomInt(max));
            const gameId = coloriaStore.create(puzzle, amount);
            tracker.started(req, {gameId, gameCode: GAME_CODE, mode: "free", gridSize: size, emptyCells: amount});
            res.status(200).json({status: "ok", data: {gameId, puzzle: publicPuzzle(puzzle)}});
        }),

        status: asyncHandler(async (req: Request, res: Response) => {
            const game = coloriaStore.get(routeParam(req.params, "gameId") ?? "");
            if (!game) {
                res.status(404).json({status: "error", message: "Partie introuvable ou expirée"});
                return;
            }
            res.status(200).json({status: "ok", data: {grid: publicPuzzle(game.puzzle), elapsedMs: Date.now() - game.createdAt}});
        }),

        validate: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const {gameId, colors} = req.body ?? {};
            if (typeof gameId !== "string") {
                res.status(400).json({status: "error", message: "La partie est obligatoire"});
                return;
            }
            const game = coloriaStore.get(gameId);
            if (!game) {
                res.status(404).json({status: "error", message: "Partie introuvable ou expirée, lance une nouvelle partie"});
                return;
            }
            if (!isColoriaSolution(game.puzzle, colors)) {
                tracker.failed(gameId);
                res.status(400).json({status: "error", message: "Deux zones voisines ont la même couleur"});
                return;
            }

            // Partie terminée : on la retire tout de suite pour empêcher une double validation
            coloriaStore.delete(gameId);
            const durationMs = Date.now() - game.createdAt;
            const userId = res.locals.userId;
            tracker.finished(gameId, durationMs, userId);
            if (!userId) {
                res.status(200).json({status: "ok", data: {xp: undefined, durationMs}});
                return;
            }
            const {zones, colors: k} = game.puzzle;
            const baseXp = await games.getBaseXp(GAME_CODE) ?? 0;
            const xp = coloriaXp(baseXp, zones, k);
            const credits = coloriaCredits(zones, k);
            const {personalBest} = await progression.recordWin(userId, GAME_CODE, xp, {gridSize: zones, emptyCells: k, durationMs}, credits);
            res.status(200).json({status: "ok", data: {xp, credits, rewardMultiplier: 1, durationMs, personalBest}});
        }),
    };
}
