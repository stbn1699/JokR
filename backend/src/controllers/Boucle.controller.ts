import {randomInt} from "node:crypto";
import type {Request, Response} from "express";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import type {AuthLocals} from "../middleware/auth.js";
import type {GamesService} from "../services/Games.service.js";
import type {ProgressionService} from "../services/Progression.service.js";
import {boucleStore} from "../services/stores.js";
import {tracker} from "../services/tracker.js";
import {routeParam} from "../utils/validation.js";
import {wordSettings} from "../utils/words.js";
import {BOUCLE_DEFAULT_SIZE, BOUCLE_SIZES, boucleCredits, boucleXp, type BouclePuzzle, generateBoucle, isBoucleSolution} from "../utils/boucle.js";

const GAME_CODE = "BOUCLE";

// Ce que le joueur reçoit : jamais la solution
const publicPuzzle = ({size, walls}: BouclePuzzle) => ({size, walls});

/*
 * Contrôleur Boucle (partie libre)
 * - settings : tailles, nombres de murs et XP de chaque réglage
 * - generate { size, amount: murs }, games/:gameId pour reprendre une partie
 * - validate { gameId, loop } : les cases de la boucle dans l'ordre ; XP si le joueur est connecté
 */
export function createBoucleController(progression: ProgressionService, games: GamesService) {
    return {
        settings: asyncHandler(async (_req: Request, res: Response) => {
            const baseXp = await games.getBaseXp(GAME_CODE) ?? 0;
            const data = wordSettings(BOUCLE_DEFAULT_SIZE, BOUCLE_SIZES, (size, walls) => boucleXp(baseXp, size, walls), boucleCredits);
            res.status(200).json({status: "ok", data});
        }),

        generate: asyncHandler(async (req: Request, res: Response) => {
            const {size, amount} = req.body ?? {};
            const limits = BOUCLE_SIZES.find(s => s.size === size);
            if (!limits || !Number.isInteger(amount) || amount < limits.min || amount > limits.max) {
                res.status(400).json({status: "error", message: "Réglages de partie non proposés"});
                return;
            }
            const puzzle = generateBoucle(size, amount, max => randomInt(max));
            const gameId = boucleStore.create(puzzle, amount);
            tracker.started(req, {gameId, gameCode: GAME_CODE, mode: "free", gridSize: size, emptyCells: amount});
            res.status(200).json({status: "ok", data: {gameId, puzzle: publicPuzzle(puzzle)}});
        }),

        status: asyncHandler(async (req: Request, res: Response) => {
            const game = boucleStore.get(routeParam(req.params, "gameId") ?? "");
            if (!game) {
                res.status(404).json({status: "error", message: "Partie introuvable ou expirée"});
                return;
            }
            res.status(200).json({status: "ok", data: {grid: publicPuzzle(game.puzzle), elapsedMs: Date.now() - game.createdAt}});
        }),

        validate: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const {gameId, loop} = req.body ?? {};
            if (typeof gameId !== "string") {
                res.status(400).json({status: "error", message: "La partie est obligatoire"});
                return;
            }
            const game = boucleStore.get(gameId);
            if (!game) {
                res.status(404).json({status: "error", message: "Partie introuvable ou expirée, lance une nouvelle partie"});
                return;
            }
            if (!isBoucleSolution(game.puzzle, loop)) {
                tracker.failed(gameId);
                res.status(400).json({status: "error", message: "Trace une seule boucle qui passe par toutes les cases"});
                return;
            }

            // Partie terminée : on la retire tout de suite pour empêcher une double validation
            boucleStore.delete(gameId);
            const durationMs = Date.now() - game.createdAt;
            const userId = res.locals.userId;
            tracker.finished(gameId, durationMs, userId);
            if (!userId) {
                res.status(200).json({status: "ok", data: {xp: undefined, durationMs}});
                return;
            }
            const {size} = game.puzzle;
            const walls = game.cluesCount;
            const baseXp = await games.getBaseXp(GAME_CODE) ?? 0;
            const xp = boucleXp(baseXp, size, walls);
            const credits = boucleCredits(size, walls);
            const {personalBest} = await progression.recordWin(userId, GAME_CODE, xp, {gridSize: size, emptyCells: walls, durationMs}, credits);
            res.status(200).json({status: "ok", data: {xp, credits, rewardMultiplier: 1, durationMs, personalBest}});
        }),
    };
}
