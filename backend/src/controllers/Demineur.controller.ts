import {randomInt} from "node:crypto";
import type {Request, Response} from "express";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import type {AuthLocals} from "../middleware/auth.js";
import type {GamesService} from "../services/Games.service.js";
import type {ProgressionService} from "../services/Progression.service.js";
import {demineurStore} from "../services/stores.js";
import {tracker} from "../services/tracker.js";
import {routeParam} from "../utils/validation.js";
import {wordSettings} from "../utils/words.js";
import {
    createDemineur,
    DEMINEUR_DEFAULT_SIZE,
    DEMINEUR_SIZES,
    demineurCredits,
    demineurXp,
    type DemineurPuzzle,
    isDemineurCleared,
    reveal,
} from "../utils/demineur.js";

const GAME_CODE = "DEMINEUR";

// Ce que le joueur voit : la taille, le nombre de mines et les cases déjà libérées, jamais les mines
const publicPuzzle = ({size, mineCount, revealed}: DemineurPuzzle) => ({size, mines: mineCount, revealed: [...revealed]});

/*
 * Contrôleur Démineur (partie libre)
 * - settings : tailles, nombres de mines et XP de chaque réglage
 * - generate { size, amount: mines }, games/:gameId pour reprendre une partie
 * - reveal { gameId, cells } : libère des cases ; une mine termine la partie (perdue)
 * - validate { gameId } : toutes les cases sans mine sont libérées ; XP si le joueur est connecté
 */
export function createDemineurController(progression: ProgressionService, games: GamesService) {
    return {
        settings: asyncHandler(async (_req: Request, res: Response) => {
            const baseXp = await games.getBaseXp(GAME_CODE) ?? 0;
            const data = wordSettings(DEMINEUR_DEFAULT_SIZE, DEMINEUR_SIZES, (size, mines) => demineurXp(baseXp, size, mines), demineurCredits);
            res.status(200).json({status: "ok", data});
        }),

        generate: asyncHandler(async (req: Request, res: Response) => {
            const {size, amount} = req.body ?? {};
            const limits = DEMINEUR_SIZES.find(s => s.size === size);
            if (!limits || !Number.isInteger(amount) || amount < limits.min || amount > limits.max) {
                res.status(400).json({status: "error", message: "Réglages de partie non proposés"});
                return;
            }
            const puzzle = createDemineur(size, amount);
            const gameId = demineurStore.create(puzzle, amount);
            tracker.started(req, {gameId, gameCode: GAME_CODE, mode: "free", gridSize: size, emptyCells: amount});
            res.status(200).json({status: "ok", data: {gameId, puzzle: publicPuzzle(puzzle)}});
        }),

        status: asyncHandler(async (req: Request, res: Response) => {
            const game = demineurStore.get(routeParam(req.params, "gameId") ?? "");
            if (!game) {
                res.status(404).json({status: "error", message: "Partie introuvable ou expirée"});
                return;
            }
            res.status(200).json({status: "ok", data: {grid: publicPuzzle(game.puzzle), elapsedMs: Date.now() - game.createdAt}});
        }),

        reveal: asyncHandler(async (req: Request, res: Response) => {
            const {gameId, cells} = req.body ?? {};
            const game = typeof gameId === "string" ? demineurStore.get(gameId) : undefined;
            if (!game) {
                res.status(404).json({status: "error", message: "Partie introuvable ou expirée, lance une nouvelle partie"});
                return;
            }
            const outcome = reveal(game.puzzle, cells, max => randomInt(max));
            if (!outcome) {
                res.status(400).json({status: "error", message: "Case inconnue"});
                return;
            }
            if (outcome.kind === "exploded") {
                // Partie perdue : elle ne peut plus être validée
                tracker.failed(gameId);
                demineurStore.delete(gameId);
            }
            res.status(200).json({status: "ok", data: outcome});
        }),

        validate: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const {gameId} = req.body ?? {};
            if (typeof gameId !== "string") {
                res.status(400).json({status: "error", message: "La partie est obligatoire"});
                return;
            }
            const game = demineurStore.get(gameId);
            if (!game) {
                res.status(404).json({status: "error", message: "Partie introuvable ou expirée, lance une nouvelle partie"});
                return;
            }
            if (!isDemineurCleared(game.puzzle)) {
                res.status(400).json({status: "error", message: "Il reste des cases à libérer"});
                return;
            }

            // Partie terminée : on la retire tout de suite pour empêcher une double validation
            demineurStore.delete(gameId);
            const durationMs = Date.now() - game.createdAt;
            const userId = res.locals.userId;
            tracker.finished(gameId, durationMs, userId);
            if (!userId) {
                res.status(200).json({status: "ok", data: {xp: undefined, durationMs}});
                return;
            }
            const {size, mineCount} = game.puzzle;
            const baseXp = await games.getBaseXp(GAME_CODE) ?? 0;
            const xp = demineurXp(baseXp, size, mineCount);
            const credits = demineurCredits(size, mineCount);
            const {personalBest} = await progression.recordWin(userId, GAME_CODE, xp, {gridSize: size, emptyCells: mineCount, durationMs}, credits);
            res.status(200).json({status: "ok", data: {xp, credits, rewardMultiplier: 1, durationMs, personalBest}});
        }),
    };
}
