import {Router, type Request, type Response} from "express";
import {pool} from "../db/pool.js";
import {createDb} from "../db/kysely.js";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import {optionalAuth, type AuthLocals} from "../middleware/auth.js";
import {LevelsRepository} from "../repository/Levels.repository.js";
import {isLevelUnlocked, LEVEL_GAMES, levelGame, levelPuzzle} from "../utils/levels.js";
import {isPuzzleGame, startPuzzle} from "../services/puzzleGames.js";
import {routeParam} from "../utils/validation.js";
import {tracker} from "../services/tracker.js";

/*
 * Mode Niveaux des puzzles (voir backend/src/utils/levels.ts)
 * - GET /levels → résumé de chaque jeu pour l'accueil : { [jeu]: { count, tutorial, done, highest } }
 * - GET /levels/:game → { tutorial, levels: [{ level, size, hints, done, bestMs }] } (done : réussi par le joueur
 *   connecté ; invité : rien de réussi, le site garde sa progression dans le navigateur)
 * - POST /levels/:game/:level/start → { date: "", alreadyDone: false, gameId, grid, size, emptyCells } (même forme
 *   qu'un défi du jour) ; joueur connecté : 403 si le niveau n'est pas encore débloqué
 * La partie se valide ensuite comme une partie normale du jeu ; la validation enregistre la réussite du niveau.
 */
const router = Router();
const repo = new LevelsRepository(createDb(pool));

const gameParam = (req: Request) => (routeParam(req.params, "game") ?? "").toUpperCase();

// Résumé de tous les jeux (accueil) : { [jeu]: { count, tutorial, done, highest } } ; invité : rien de réussi
router.get("/", optionalAuth, asyncHandler(async (_req: Request, res: Response<unknown, AuthLocals>) => {
    const userId = res.locals.ghost ? undefined : res.locals.userId;
    const progress = new Map((userId ? await repo.summary(userId) : []).map(p => [p.gameCode, p]));
    const data = Object.fromEntries(Object.entries(LEVEL_GAMES).map(([code, game]) => [code, {
        count: game.levels.length,
        tutorial: game.tutorial,
        done: progress.get(code)?.done ?? 0,
        highest: progress.get(code)?.highest ?? 0,
    }]));
    res.status(200).json({status: "ok", data});
}));

router.get("/:game", optionalAuth, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const code = gameParam(req);
    const game = levelGame(code);
    if (!game) return void res.status(404).json({status: "error", message: "Pas de niveaux pour ce jeu"});
    const userId = res.locals.ghost ? undefined : res.locals.userId;
    const done = new Map((userId ? await repo.progress(userId, code) : []).map(p => [p.level, p.bestMs]));
    res.status(200).json({status: "ok", data: {
        tutorial: game.tutorial,
        levels: game.levels.map((puzzle, i) => ({level: i + 1, ...game.describe(puzzle), done: done.has(i + 1), bestMs: done.get(i + 1) ?? null})),
    }});
}));

router.post("/:game/:level/start", optionalAuth, asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
    const code = gameParam(req);
    const level = Number(routeParam(req.params, "level"));
    const puzzle = levelPuzzle(code, level);
    if (!puzzle || !isPuzzleGame(code)) return void res.status(404).json({status: "error", message: "Niveau introuvable"});

    const userId = res.locals.ghost ? undefined : res.locals.userId;
    if (userId) {
        const done = new Set((await repo.progress(userId, code)).map(p => p.level));
        if (!isLevelUnlocked(level, done)) {
            return void res.status(403).json({status: "error", message: "Réussis d'abord le niveau précédent"});
        }
    }

    const {size, hints} = levelGame(code)!.describe(puzzle);
    const {gameId, grid} = startPuzzle(code, puzzle, {aid: hints, level});
    tracker.started(req, {gameId, gameCode: code, mode: "free", gridSize: size, emptyCells: hints});
    res.status(200).json({status: "ok", data: {date: "", alreadyDone: false, gameId, grid, size, emptyCells: hints}});
}));

export default router;
