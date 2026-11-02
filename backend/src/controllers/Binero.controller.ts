import type {Request, Response} from "express";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import {BineroService, bineroLimits, toApiGrid} from "../services/Binero.service.js";
import type {PuzzleStore} from "../services/PuzzleStore.js";
import type {ProgressionService} from "../services/Progression.service.js";
import type {GamesService} from "../services/Games.service.js";
import type {AuthLocals} from "../middleware/auth.js";
import {DAILY_REWARD_MULTIPLIER, type DailyService} from "../services/Daily.service.js";
import {type BineroGrid, countBineroClues} from "../utils/binero.js";
import {routeParam} from "../utils/validation.js";

const GAME_CODE = "BINERO";

/*
 * Contrôleur Binero
 * - settings : tailles proposées, plage de cases à remplir et XP pour chacune
 * - generate : génère une grille, la mémorise et renvoie { gameId, grid } (null = case vide)
 * - status : grille de départ et temps écoulé d'une partie en cours (pour la reprendre)
 * - validate : vérifie la solution ; si le joueur est connecté (JWT), enregistre la victoire et l'XP.
 *   Chaque partie ne peut être validée qu'une fois.
 */
export function createBineroController(
    service: BineroService,
    store: PuzzleStore<BineroGrid>,
    progressionService: ProgressionService,
    gamesService: GamesService,
    dailyService: DailyService,
) {
    return {
        settings: asyncHandler(async (_req: Request, res: Response) => {
            const baseXp = await gamesService.getBaseXp(GAME_CODE) ?? 0;
            res.status(200).json({status: "ok", data: service.settings(baseXp)});
        }),

        // Body attendu : { size: number, emptyCells: number }
        generate: asyncHandler(async (req: Request, res: Response) => {
            const {size, emptyCells} = req.body ?? {};
            const limits = Number.isInteger(size) ? bineroLimits(size) : undefined;

            if (!limits) {
                res.status(400).json({status: "error", message: "Taille de grille non proposée"});
                return;
            }
            if (!Number.isInteger(emptyCells) || emptyCells < limits.minEmptyCells || emptyCells > limits.maxEmptyCells) {
                res.status(400).json({
                    status: "error",
                    message: `Le nombre de cases à remplir doit être compris entre ${limits.minEmptyCells} et ${limits.maxEmptyCells}`,
                });
                return;
            }

            const puzzle = service.generate(size, size * size - emptyCells);
            const gameId = store.create(puzzle, countBineroClues(puzzle));
            res.status(200).json({status: "ok", data: {gameId, grid: toApiGrid(puzzle)}});
        }),

        // Partie en cours : grille de départ et temps écoulé (404 si terminée, expirée ou serveur redémarré)
        status: asyncHandler(async (req: Request, res: Response) => {
            const game = store.get(routeParam(req.params, "gameId") ?? "");
            if (!game) {
                res.status(404).json({status: "error", message: "Partie introuvable ou expirée"});
                return;
            }
            res.status(200).json({status: "ok", data: {grid: toApiGrid(game.puzzle), elapsedMs: Date.now() - game.createdAt}});
        }),

        // Body attendu : { gameId: string, grid: (0|1)[][] }
        validate: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const {gameId, grid} = req.body ?? {};

            if (typeof gameId !== "string" || !grid) {
                res.status(400).json({status: "error", message: "La partie et la grille sont obligatoires"});
                return;
            }

            const game = store.get(gameId);
            if (!game) {
                res.status(404).json({status: "error", message: "Partie introuvable ou expirée, génère une nouvelle grille"});
                return;
            }

            const size = game.puzzle.length;
            if (!service.validate(grid, size) || !service.respectsClues(game.puzzle, grid)) {
                res.status(400).json({status: "error", message: "La grille ne respecte pas les règles"});
                return;
            }

            // Partie terminée : on la retire tout de suite pour empêcher une double validation
            store.delete(gameId);

            // Temps mesuré par le serveur (de la génération à la validation)
            const durationMs = Date.now() - game.createdAt;

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

            const baseXp = await gamesService.getBaseXp(GAME_CODE) ?? 0;
            // Défi du jour (réussite qui compte) : XP et crédits doublés
            const multiplier = daily?.counted ? DAILY_REWARD_MULTIPLIER : 1;
            const xp = service.computeXp(baseXp, size, size * size - game.cluesCount) * multiplier;
            const credits = service.computeCredits(size, size * size - game.cluesCount) * multiplier;
            const {personalBest} = await progressionService.recordWin(userId, GAME_CODE, xp, {
                gridSize: size,
                emptyCells: size * size - game.cluesCount,
                durationMs,
            }, credits);

            res.status(200).json({status: "ok", data: {xp, credits, rewardMultiplier: multiplier, durationMs, personalBest, daily}});
        }),
    };
}
