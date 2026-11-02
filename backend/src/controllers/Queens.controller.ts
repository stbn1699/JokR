import type {Request, Response} from "express";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import {queensLimits, type QueensService} from "../services/Queens.service.js";
import type {PuzzleStore} from "../services/PuzzleStore.js";
import type {ProgressionService} from "../services/Progression.service.js";
import type {GamesService} from "../services/Games.service.js";
import type {AuthLocals} from "../middleware/auth.js";
import {DAILY_REWARD_MULTIPLIER, type DailyService} from "../services/Daily.service.js";
import type {QueensPuzzle} from "../utils/queens.js";
import {routeParam} from "../utils/validation.js";
import {tracker} from "../services/tracker.js";

const GAME_CODE = "QUEENS";

/*
 * Contrôleur Queens
 * - settings : tailles proposées (6×6 à 10×10), plage de dames données en aide et XP pour chacune
 * - generate : génère une grille, la mémorise et renvoie { gameId, puzzle: { size, regions, queens } }
 * - status : grille de départ et temps écoulé d'une partie en cours (pour la reprendre)
 * - validate : vérifie les dames ; si le joueur est connecté (JWT), enregistre la victoire et l'XP.
 *   Chaque partie ne peut être validée qu'une fois.
 *
 * Dans les statistiques et l'historique, le nombre de dames données est rangé avec les « cases à remplir »
 * des autres jeux (colonne empty_cells).
 */
export function createQueensController(
    service: QueensService,
    store: PuzzleStore<QueensPuzzle>,
    progressionService: ProgressionService,
    gamesService: GamesService,
    dailyService: DailyService,
) {
    return {
        settings: asyncHandler(async (_req: Request, res: Response) => {
            const baseXp = await gamesService.getBaseXp(GAME_CODE) ?? 0;
            res.status(200).json({status: "ok", data: service.settings(baseXp)});
        }),

        // Body attendu : { size: number (côté : 6 à 10), hints: number (dames données) }
        generate: asyncHandler(async (req: Request, res: Response) => {
            const {size, hints} = req.body ?? {};
            const limits = Number.isInteger(size) ? queensLimits(size) : undefined;

            if (!limits) {
                res.status(400).json({status: "error", message: "Taille de grille non proposée"});
                return;
            }
            if (!Number.isInteger(hints) || hints < limits.minHints || hints > limits.maxHints) {
                res.status(400).json({
                    status: "error",
                    message: `Le nombre de dames données doit être compris entre ${limits.minHints} et ${limits.maxHints}`,
                });
                return;
            }

            const puzzle = service.generate(size, hints);
            const gameId = store.create(puzzle, puzzle.queens.length);
            tracker.started(req, {gameId, gameCode: GAME_CODE, mode: "free", gridSize: size, emptyCells: puzzle.queens.length});
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

        // Body attendu : { gameId: string, queens: number[] } (case de chaque dame, index = ligne * N + colonne)
        validate: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const {gameId, queens} = req.body ?? {};

            if (typeof gameId !== "string" || !queens) {
                res.status(400).json({status: "error", message: "La partie et les dames sont obligatoires"});
                return;
            }

            const game = store.get(gameId);
            if (!game) {
                res.status(404).json({status: "error", message: "Partie introuvable ou expirée, génère une nouvelle grille"});
                return;
            }

            if (!service.validate(game.puzzle, queens)) {
                tracker.failed(gameId);
                res.status(400).json({status: "error", message: "Les dames ne respectent pas les règles"});
                return;
            }

            // Partie terminée : on la retire tout de suite pour empêcher une double validation
            store.delete(gameId);

            // Temps mesuré par le serveur (de la génération à la validation)
            const durationMs = Date.now() - game.createdAt;
            tracker.finished(gameId, durationMs, res.locals.userId);

            const userId = res.locals.userId;
            if (!userId) {
                res.status(200).json({status: "ok", data: {xp: undefined, durationMs}});
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
            // Défi du jour (réussite qui compte) : XP et crédits doublés
            const multiplier = daily?.counted ? DAILY_REWARD_MULTIPLIER : 1;
            const xp = service.computeXp(baseXp, size, hints) * multiplier;
            const credits = service.computeCredits(size, hints) * multiplier;
            const {personalBest} = await progressionService.recordWin(userId, GAME_CODE, xp, {
                gridSize: size,
                emptyCells: hints,
                durationMs,
            }, credits);

            res.status(200).json({status: "ok", data: {xp, credits, rewardMultiplier: multiplier, durationMs, personalBest, daily}});
        }),
    };
}
