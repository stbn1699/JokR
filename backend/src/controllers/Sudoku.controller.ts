import type {Request, Response} from "express";
import {countClues, SUDOKU_LIMITS, SudokuService} from "../services/Sudoku.service.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import type {ProgressionService} from "../services/Progression.service.js";
import type {GamesService} from "../services/Games.service.js";
import type {PuzzleStore} from "../services/PuzzleStore.js";
import type {AuthLocals} from "../middleware/auth.js";
import {routeParam} from "../utils/validation.js";

const GAME_CODE = "SUDOKU";

/*
 * Contrôleur Sudoku
 * - settings : plage de cases vides proposée et XP gagnée pour chaque valeur
 * - generate : génère une grille, la mémorise côté serveur et renvoie { gameId, grid }
 * - status : grille de départ et temps écoulé d'une partie en cours (pour la reprendre)
 * - validate : vérifie la solution d'une grille générée ; si l'utilisateur est connecté (JWT),
 *   l'XP est calculée et enregistrée côté serveur. Chaque partie ne peut être validée qu'une fois.
 */
export function createSudokuController(
    service: SudokuService,
    store: PuzzleStore<number[][]>,
    progressionService: ProgressionService,
    gamesService: GamesService,
) {
    const minClues = 81 - SUDOKU_LIMITS.maxEmptyCells;
    const maxClues = 81 - SUDOKU_LIMITS.minEmptyCells;

    return {
        settings: asyncHandler(async (_req: Request, res: Response) => {
            const baseXp = await gamesService.getBaseXp(GAME_CODE) ?? 0;
            res.status(200).json({
                status: "ok",
                data: {...SUDOKU_LIMITS, xpByEmptyCells: service.xpTable(baseXp)},
            });
        }),

        generate: asyncHandler(async (req: Request, res: Response) => {
            const {cluesCount} = req.body ?? {};

            // Plage limitée à ce que le générateur atteint vite et de façon fiable (voir SUDOKU_LIMITS)
            if (!Number.isInteger(cluesCount) || cluesCount < minClues || cluesCount > maxClues) {
                res.status(400).json({status: "error", message: `Le nombre d'indices doit être compris entre ${minClues} et ${maxClues}`});
                return;
            }

            // call service with timeout
            const timeoutMs = 15000; // 15s
            let timer: NodeJS.Timeout | undefined;
            const timeoutPromise = new Promise<never>((_res, rej) => {
                timer = setTimeout(() => rej(new Error('generation timeout')), timeoutMs);
            });

            let grid: number[][];
            try {
                grid = await Promise.race([service.generate(cluesCount), timeoutPromise]);
            } catch (err) {
                console.error('[Sudoku] generation error or timeout', err);
                res.status(503).json({status: 'error', message: 'La génération de la grille a échoué, réessaie'});
                return;
            } finally {
                clearTimeout(timer);
            }

            const gameId = store.create(grid, countClues(grid));
            res.status(200).json({status: "ok", data: {gameId, grid}});
        }),

        // Partie en cours : grille de départ et temps écoulé (404 si terminée, expirée ou serveur redémarré)
        status: asyncHandler(async (req: Request, res: Response) => {
            const game = store.get(routeParam(req.params, "gameId") ?? "");
            if (!game) {
                res.status(404).json({status: 'error', message: 'Partie introuvable ou expirée'});
                return;
            }
            res.status(200).json({status: 'ok', data: {grid: game.puzzle, elapsedMs: Date.now() - game.createdAt}});
        }),

        // Body attendu : { gameId: string, grid: number[][] }
        validate: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
            const {gameId, grid} = req.body ?? {};

            if (typeof gameId !== "string" || !grid) {
                res.status(400).json({status: 'error', message: 'La partie et la grille sont obligatoires'});
                return;
            }

            const game = store.get(gameId);
            if (!game) {
                res.status(404).json({status: 'error', message: 'Partie introuvable ou expirée, génère une nouvelle grille'});
                return;
            }

            if (!service.validate(grid) || !service.respectsClues(game.puzzle, grid)) {
                res.status(400).json({status: 'error', message: 'La grille ne respecte pas les règles'});
                return;
            }

            // Partie terminée : on la retire tout de suite pour empêcher une double validation
            store.delete(gameId);

            // Temps mesuré par le serveur (de la génération à la validation)
            const durationMs = Date.now() - game.createdAt;

            // Invité : grille valide mais pas d'XP
            const userId = res.locals.userId;
            if (!userId) {
                res.status(200).json({status: 'ok', data: {xp: undefined, durationMs}});
                return;
            }

            // XP calculée uniquement côté serveur, à partir du nombre réel d'indices de la grille
            const baseXp = await gamesService.getBaseXp(GAME_CODE) ?? 0;
            const xp = service.computeXp(baseXp, game.cluesCount);

            const {personalBest} = await progressionService.recordWin(userId, GAME_CODE, xp, {
                gridSize: 9,
                emptyCells: 81 - game.cluesCount,
                durationMs,
            });

            res.status(200).json({status: 'ok', data: {xp, durationMs, personalBest}});
        })
    };
}
