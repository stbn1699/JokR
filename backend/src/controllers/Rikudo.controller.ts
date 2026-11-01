import type {Request, Response} from "express";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import {type RikudoService, rikudoLimits} from "../services/Rikudo.service.js";
import type {PuzzleStore} from "../services/PuzzleStore.js";
import type {ProgressionService} from "../services/Progression.service.js";
import type {GamesService} from "../services/Games.service.js";
import type {AuthLocals} from "../middleware/auth.js";
import type {RikudoPuzzle} from "../utils/rikudo.js";
import {routeParam} from "../utils/validation.js";

const GAME_CODE = "RIKUDO";

/*
 * Contrôleur Rikudo
 * - settings : tailles proposées (36, 60, 90 cases), plage de cases à remplir et XP pour chacune
 * - generate : génère une grille, la mémorise et renvoie { gameId, puzzle: { radius, cells, links } }
 * - status : grille de départ et temps écoulé d'une partie en cours (pour la reprendre)
 * - validate : vérifie la solution ; si le joueur est connecté (JWT), enregistre la victoire et l'XP.
 *   Chaque partie ne peut être validée qu'une fois.
 */
export function createRikudoController(
    service: RikudoService,
    store: PuzzleStore<RikudoPuzzle>,
    progressionService: ProgressionService,
    gamesService: GamesService,
) {
    return {
        settings: asyncHandler(async (_req: Request, res: Response) => {
            const baseXp = await gamesService.getBaseXp(GAME_CODE) ?? 0;
            res.status(200).json({status: "ok", data: service.settings(baseXp)});
        }),

        // Body attendu : { size: number (36, 60 ou 90), emptyCells: number }
        generate: asyncHandler(async (req: Request, res: Response) => {
            const {size, emptyCells} = req.body ?? {};
            const limits = Number.isInteger(size) ? rikudoLimits(size) : undefined;

            if (!limits) {
                res.status(400).json({status: "error", message: "Taille de plateau non proposée"});
                return;
            }
            if (!Number.isInteger(emptyCells) || emptyCells < limits.minEmptyCells || emptyCells > limits.maxEmptyCells) {
                res.status(400).json({
                    status: "error",
                    message: `Le nombre de cases à remplir doit être compris entre ${limits.minEmptyCells} et ${limits.maxEmptyCells}`,
                });
                return;
            }

            const puzzle = service.generate(size, size - emptyCells);
            const gameId = store.create(puzzle, service.countClues(puzzle));
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

        // Body attendu : { gameId: string, values: number[] } (un nombre par case, dans l'ordre du plateau)
        validate: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const {gameId, values} = req.body ?? {};

            if (typeof gameId !== "string" || !values) {
                res.status(400).json({status: "error", message: "La partie et la grille sont obligatoires"});
                return;
            }

            const game = store.get(gameId);
            if (!game) {
                res.status(404).json({status: "error", message: "Partie introuvable ou expirée, génère une nouvelle grille"});
                return;
            }

            if (!service.validate(game.puzzle, values)) {
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

            const size = game.puzzle.cells.length;
            const emptyCells = size - game.cluesCount;
            const baseXp = await gamesService.getBaseXp(GAME_CODE) ?? 0;
            const xp = service.computeXp(baseXp, size, emptyCells);
            const {personalBest} = await progressionService.recordWin(userId, GAME_CODE, xp, {
                gridSize: size,
                emptyCells,
                durationMs,
            });

            res.status(200).json({status: "ok", data: {xp, durationMs, personalBest}});
        }),
    };
}
