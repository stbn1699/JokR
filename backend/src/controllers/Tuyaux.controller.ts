import {randomInt} from "node:crypto";
import type {Request, Response} from "express";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import type {AuthLocals} from "../middleware/auth.js";
import type {GamesService} from "../services/Games.service.js";
import type {ProgressionService} from "../services/Progression.service.js";
import {tuyauxStore} from "../services/stores.js";
import {tracker} from "../services/tracker.js";
import {routeParam} from "../utils/validation.js";
import {wordSettings} from "../utils/words.js";
import {generateTuyaux, isTuyauxSolution, TUYAUX_DEFAULT_SIZE, TUYAUX_SIZES, tuyauxCredits, tuyauxXp, type TuyauxPuzzle} from "../utils/tuyaux.js";

const GAME_CODE = "TUYAUX";

// Ce que le joueur reçoit : jamais la solution
const publicPuzzle = ({size, tiles, locked}: TuyauxPuzzle) => ({size, tiles, locked});

/*
 * Contrôleur Tuyaux (partie libre)
 * - settings : tailles proposées, cases données possibles et XP de chaque réglage
 * - generate { size, amount: cases données }, games/:gameId pour reprendre une partie
 * - validate { gameId, turns } : quarts de tour (0 à 3) de chaque pièce ; XP si le joueur est connecté
 */
export function createTuyauxController(progression: ProgressionService, games: GamesService) {
    return {
        settings: asyncHandler(async (_req: Request, res: Response) => {
            const baseXp = await games.getBaseXp(GAME_CODE) ?? 0;
            const data = wordSettings(TUYAUX_DEFAULT_SIZE, TUYAUX_SIZES, (size, hints) => tuyauxXp(baseXp, size, hints), tuyauxCredits);
            res.status(200).json({status: "ok", data});
        }),

        generate: asyncHandler(async (req: Request, res: Response) => {
            const {size, amount} = req.body ?? {};
            const limits = TUYAUX_SIZES.find(s => s.size === size);
            if (!limits || !Number.isInteger(amount) || amount < limits.min || amount > limits.max) {
                res.status(400).json({status: "error", message: "Réglages de partie non proposés"});
                return;
            }
            const puzzle = generateTuyaux(size, amount, max => randomInt(max));
            const gameId = tuyauxStore.create(puzzle, amount);
            tracker.started(req, {gameId, gameCode: GAME_CODE, mode: "free", gridSize: size, emptyCells: amount});
            res.status(200).json({status: "ok", data: {gameId, puzzle: publicPuzzle(puzzle)}});
        }),

        status: asyncHandler(async (req: Request, res: Response) => {
            const game = tuyauxStore.get(routeParam(req.params, "gameId") ?? "");
            if (!game) {
                res.status(404).json({status: "error", message: "Partie introuvable ou expirée"});
                return;
            }
            res.status(200).json({status: "ok", data: {grid: publicPuzzle(game.puzzle), elapsedMs: Date.now() - game.createdAt}});
        }),

        validate: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const {gameId, turns} = req.body ?? {};
            if (typeof gameId !== "string") {
                res.status(400).json({status: "error", message: "La partie est obligatoire"});
                return;
            }
            const game = tuyauxStore.get(gameId);
            if (!game) {
                res.status(404).json({status: "error", message: "Partie introuvable ou expirée, lance une nouvelle partie"});
                return;
            }
            if (!isTuyauxSolution(game.puzzle, turns)) {
                tracker.failed(gameId);
                res.status(400).json({status: "error", message: "Le réseau n'est pas complet"});
                return;
            }

            // Partie terminée : on la retire tout de suite pour empêcher une double validation
            tuyauxStore.delete(gameId);
            const durationMs = Date.now() - game.createdAt;
            const userId = res.locals.userId;
            tracker.finished(gameId, durationMs, userId);
            if (!userId) {
                res.status(200).json({status: "ok", data: {xp: undefined, durationMs}});
                return;
            }
            const {size} = game.puzzle;
            const hints = game.cluesCount;
            const baseXp = await games.getBaseXp(GAME_CODE) ?? 0;
            const xp = tuyauxXp(baseXp, size, hints);
            const credits = tuyauxCredits(size, hints);
            const {personalBest} = await progression.recordWin(userId, GAME_CODE, xp, {gridSize: size, emptyCells: hints, durationMs}, credits);
            res.status(200).json({status: "ok", data: {xp, credits, rewardMultiplier: 1, durationMs, personalBest}});
        }),
    };
}
