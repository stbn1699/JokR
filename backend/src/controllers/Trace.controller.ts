import type {Request, Response} from "express";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import {traceLimits, type TraceService} from "../services/Trace.service.js";
import type {PuzzleStore} from "../services/PuzzleStore.js";
import type {ProgressionService} from "../services/Progression.service.js";
import type {GamesService} from "../services/Games.service.js";
import type {AuthLocals} from "../middleware/auth.js";
import {DAILY_REWARD_MULTIPLIER, type DailyService} from "../services/Daily.service.js";
import type {TracePuzzle} from "../utils/trace.js";
import {routeParam} from "../utils/validation.js";
import {tracker} from "../services/tracker.js";
import type {LevelsRepository} from "../repository/Levels.repository.js";
import {recordLevelWin} from "../services/levelWin.js";

const GAME_CODE = "TRACE";

/*
 * Contrôleur Tracé
 * - settings : tailles proposées (5×5 à 8×8), plage de numéros donnés en plus et XP pour chacune
 * - generate : génère une grille, la mémorise et renvoie { gameId, puzzle: { size, numbers, walls } }
 * - status : grille de départ et temps écoulé d'une partie en cours (pour la reprendre)
 * - validate : vérifie le chemin ; si le joueur est connecté (JWT), enregistre la victoire et l'XP.
 *   Chaque partie ne peut être validée qu'une fois.
 *
 * Dans les statistiques et l'historique, le nombre de numéros donnés en plus est rangé avec les « cases à
 * remplir » des autres jeux (colonne empty_cells), comme l'aide du Queens.
 */
export function createTraceController(
    service: TraceService,
    store: PuzzleStore<TracePuzzle>,
    progressionService: ProgressionService,
    gamesService: GamesService,
    dailyService: DailyService,
    levels: LevelsRepository,
) {
    return {
        settings: asyncHandler(async (_req: Request, res: Response) => {
            const baseXp = await gamesService.getBaseXp(GAME_CODE) ?? 0;
            res.status(200).json({status: "ok", data: service.settings(baseXp)});
        }),

        // Body attendu : { size: number (côté : 5 à 8), hints: number (numéros donnés en plus) }
        generate: asyncHandler(async (req: Request, res: Response) => {
            const {size, hints} = req.body ?? {};
            const limits = Number.isInteger(size) ? traceLimits(size) : undefined;

            if (!limits) {
                res.status(400).json({status: "error", message: "Taille de grille non proposée"});
                return;
            }
            if (!Number.isInteger(hints) || hints < limits.minHints || hints > limits.maxHints) {
                res.status(400).json({
                    status: "error",
                    message: `Le nombre de numéros donnés doit être compris entre ${limits.minHints} et ${limits.maxHints}`,
                });
                return;
            }

            const puzzle = service.generate(size, hints);
            const gameId = store.create(puzzle, hints);
            tracker.started(req, {gameId, gameCode: GAME_CODE, mode: "free", gridSize: size, emptyCells: hints});
            res.status(200).json({status: "ok", data: {gameId, puzzle}});
        }),

        // Partie en cours : grille de départ et temps écoulé (404 si terminée, expirée ou serveur redémarré)
        status: asyncHandler(async (req: Request, res: Response) => {
            const game = store.get(routeParam(req.params, "gameId") ?? "");
            if (!game) {
                res.status(404).json({status: "error", message: "Partie introuvable ou expirée"});
                return;
            }
            res.status(200).json({status: "ok", data: {grid: game.puzzle, elapsedMs: Date.now() - game.createdAt}});
        }),

        // Body attendu : { gameId: string, path: number[] } (cases dans l'ordre du chemin, index = ligne * N + colonne)
        validate: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const {gameId, path} = req.body ?? {};

            if (typeof gameId !== "string" || !path) {
                res.status(400).json({status: "error", message: "La partie et le chemin sont obligatoires"});
                return;
            }

            const game = store.get(gameId);
            if (!game) {
                res.status(404).json({status: "error", message: "Partie introuvable ou expirée, génère une nouvelle grille"});
                return;
            }

            if (!service.validate(game.puzzle, path)) {
                tracker.failed(gameId);
                res.status(400).json({status: "error", message: "Le chemin ne respecte pas les règles"});
                return;
            }

            // Partie terminée : on la retire tout de suite pour empêcher une double validation
            store.delete(gameId);

            const durationMs = Date.now() - game.createdAt;
            tracker.finished(gameId, durationMs, res.locals.userId);

            const userId = res.locals.userId;
            if (!userId) {
                res.status(200).json({status: "ok", data: {xp: undefined, durationMs}});
                return;
            }

            // Mode Niveaux : réussite enregistrée ; un niveau déjà réussi ne rapporte plus rien
            if (game.level) {
                const data = await recordLevelWin(levels, progressionService, GAME_CODE, game.level, userId, durationMs, async () => {
                    const baseXp = await gamesService.getBaseXp(GAME_CODE) ?? 0;
                    return {xp: service.computeXp(baseXp, game.puzzle.size, game.cluesCount), credits: service.computeCredits(game.puzzle.size, game.cluesCount), gridSize: game.puzzle.size, emptyCells: game.cluesCount};
                });
                res.status(200).json({status: "ok", data});
                return;
            }

            // Défi du jour : une seule réussite compte par jour (pas d'XP pour les suivantes)
            const daily = game.daily ? await dailyService.recordResult(GAME_CODE, game.daily, userId, durationMs) : undefined;
            if (daily && !daily.counted) {
                res.status(200).json({status: "ok", data: {xp: undefined, durationMs, daily}});
                return;
            }

            const size = game.puzzle.size;
            const hints = game.cluesCount;
            const baseXp = await gamesService.getBaseXp(GAME_CODE) ?? 0;
            const multiplier = daily?.counted ? DAILY_REWARD_MULTIPLIER : 1;
            const xp = service.computeXp(baseXp, size, hints) * multiplier;
            const credits = service.computeCredits(size, hints) * multiplier;
            const {personalBest, xp: xpWon, credits: creditsWon, streak} = await progressionService.recordWin(userId, GAME_CODE, xp, {
                gridSize: size,
                emptyCells: hints,
                durationMs,
            }, credits);

            res.status(200).json({status: "ok", data: {xp: xpWon, credits: creditsWon, rewardMultiplier: multiplier, durationMs, personalBest, streak, daily}});
        }),
    };
}
