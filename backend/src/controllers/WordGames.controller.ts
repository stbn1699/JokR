import {randomInt} from "node:crypto";
import type {Request, Response} from "express";
import {asyncHandler} from "../AsyncRouteHandlerMiddleware.js";
import type {AuthLocals} from "../middleware/auth.js";
import type {GamesService} from "../services/Games.service.js";
import type {ProgressionService} from "../services/Progression.service.js";
import {devimotStore, echelleStore, motsACaserStore, motsMelesStore} from "../services/stores.js";
import {tracker} from "../services/tracker.js";
import {routeParam} from "../utils/validation.js";
import {isAcceptedWord, isWordLength, normalizeWordInput, wordSettings, type WordSizeLimits} from "../utils/words.js";
import {DEVIMOT_DEFAULT_SIZE, DEVIMOT_SIZES, devimotCredits, devimotXp, generateDevimot, scoreGuess, type DevimotPuzzle} from "../utils/devimot.js";
import {ECHELLE_DEFAULT_SIZE, ECHELLE_SIZES, echelleCredits, echelleXp, generateEchelle, isEchelleSolution, isOneLetterApart} from "../utils/echelle.js";
import {generateMotsMeles, isMotsMelesSolution, MOTS_MELES_DEFAULT_SIZE, MOTS_MELES_SIZES, motsMelesCredits, motsMelesXp} from "../utils/motsMeles.js";
import {generateMotsACaser, isMotsACaserSolution, MOTS_A_CASER_DEFAULT_SIZE, MOTS_A_CASER_SIZES, motsACaserCredits, motsACaserXp, type MotsACaserPuzzle} from "../utils/motsACaser.js";

/*
 * Jeux de mots (partie libre) : Devimot, Échelle, Mots mêlés et Mots à caser.
 * Mêmes routes que les autres jeux : settings, generate { size, amount }, games/:gameId, puis la validation.
 * `amount` = essais (Devimot), étapes (Échelle), mots à trouver (Mots mêlés) ou mots déjà placés (Mots à caser) ;
 * rangé en « cases à remplir » dans les statistiques, comme l'aide des autres jeux.
 */

const random = (max: number) => randomInt(max);

const badRequest = (res: Response, message: string) => void res.status(400).json({status: "error", message});
const gameNotFound = (res: Response) => void res.status(404).json({status: "error", message: "Partie introuvable ou expirée, lance une nouvelle partie"});

// Taille et valeur du curseur reçues, si elles sont proposées
function readSettings(req: Request, sizes: readonly WordSizeLimits[]): { size: number; amount: number } | null {
    const {size, amount} = req.body ?? {};
    const limits = sizes.find(s => s.size === size);
    if (!limits || !Number.isInteger(amount) || amount < limits.min || amount > limits.max) return null;
    return {size, amount};
}

// Ce que le joueur voit d'une partie de Devimot : jamais le mot à trouver
const publicDevimot = ({length, maxAttempts, guesses}: DevimotPuzzle) => ({length, maxAttempts, guesses});
// Mots à caser : la grille et la liste, sans la solution
const publicMotsACaser = ({size, cells, words}: MotsACaserPuzzle) => ({size, cells, words});

export function createWordGamesController(progression: ProgressionService, games: GamesService) {
    // Victoire : XP et crédits si le joueur est connecté
    const reward = async (code: string, userId: string | undefined, durationMs: number, size: number, amount: number,
                          xpFor: (baseXp: number, size: number, amount: number) => number,
                          creditsOf: (size: number, amount: number) => number) => {
        if (!userId) return {xp: undefined, durationMs};
        const baseXp = await games.getBaseXp(code) ?? 0;
        const xp = xpFor(baseXp, size, amount);
        const credits = creditsOf(size, amount);
        const {personalBest} = await progression.recordWin(userId, code, xp, {gridSize: size, emptyCells: amount, durationMs}, credits);
        return {xp, credits, rewardMultiplier: 1, durationMs, personalBest};
    };

    const settingsOf = (code: string, defaultSize: number, sizes: readonly WordSizeLimits[],
                        xpFor: (baseXp: number, size: number, amount: number) => number,
                        creditsOf: (size: number, amount: number) => number) =>
        asyncHandler(async (_req: Request, res: Response) => {
            const baseXp = await games.getBaseXp(code) ?? 0;
            res.status(200).json({status: "ok", data: wordSettings(defaultSize, sizes, (s, a) => xpFor(baseXp, s, a), creditsOf)});
        });

    return {
        devimot: {
            settings: settingsOf("DEVIMOT", DEVIMOT_DEFAULT_SIZE, DEVIMOT_SIZES, devimotXp, devimotCredits),

            generate: asyncHandler(async (req: Request, res: Response) => {
                const settings = readSettings(req, DEVIMOT_SIZES);
                if (!settings || !isWordLength(settings.size)) return badRequest(res, "Réglages de partie non proposés");
                const puzzle = generateDevimot(settings.size, settings.amount, random);
                const gameId = devimotStore.create(puzzle, settings.amount);
                tracker.started(req, {gameId, gameCode: "DEVIMOT", mode: "free", gridSize: settings.size, emptyCells: settings.amount});
                res.status(200).json({status: "ok", data: {gameId, puzzle: publicDevimot(puzzle)}});
            }),

            status: asyncHandler(async (req: Request, res: Response) => {
                const game = devimotStore.get(routeParam(req.params, "gameId") ?? "");
                if (!game) return gameNotFound(res);
                res.status(200).json({status: "ok", data: {grid: publicDevimot(game.puzzle), elapsedMs: Date.now() - game.createdAt}});
            }),

            // Body : { gameId, word } ; un mot hors dictionnaire ne coûte pas d'essai
            guess: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
                const {gameId, word} = req.body ?? {};
                if (typeof gameId !== "string" || typeof word !== "string") return badRequest(res, "La partie et le mot sont obligatoires");
                const game = devimotStore.get(gameId);
                if (!game) return gameNotFound(res);

                const {puzzle} = game;
                const guess = normalizeWordInput(word);
                if (guess.length !== puzzle.length) return badRequest(res, `Le mot doit faire ${puzzle.length} lettres`);
                if (!isAcceptedWord(guess)) return badRequest(res, "Ce mot n'est pas dans le dictionnaire");
                if (puzzle.guesses.some(g => g.word === guess)) return badRequest(res, "Tu as déjà essayé ce mot");

                const marks = scoreGuess(puzzle.secret, guess);
                puzzle.guesses.push({word: guess, marks});

                if (guess === puzzle.secret) {
                    devimotStore.delete(gameId);
                    const durationMs = Date.now() - game.createdAt;
                    tracker.finished(gameId, durationMs, res.locals.userId);
                    const result = await reward("DEVIMOT", res.locals.userId, durationMs, puzzle.length, puzzle.maxAttempts, devimotXp, devimotCredits);
                    return void res.status(200).json({status: "ok", data: {marks, state: "won", answer: puzzle.answer, result}});
                }
                if (puzzle.guesses.length >= puzzle.maxAttempts) {
                    devimotStore.delete(gameId);
                    tracker.failed(gameId);
                    return void res.status(200).json({status: "ok", data: {marks, state: "lost", answer: puzzle.answer}});
                }
                res.status(200).json({status: "ok", data: {marks, state: "playing"}});
            }),
        },

        echelle: {
            settings: settingsOf("ECHELLE", ECHELLE_DEFAULT_SIZE, ECHELLE_SIZES, echelleXp, echelleCredits),

            generate: asyncHandler(async (req: Request, res: Response) => {
                const settings = readSettings(req, ECHELLE_SIZES);
                if (!settings || !isWordLength(settings.size)) return badRequest(res, "Réglages de partie non proposés");
                const puzzle = generateEchelle(settings.size, settings.amount, random);
                const gameId = echelleStore.create(puzzle, settings.amount);
                tracker.started(req, {gameId, gameCode: "ECHELLE", mode: "free", gridSize: settings.size, emptyCells: settings.amount});
                res.status(200).json({status: "ok", data: {gameId, puzzle}});
            }),

            status: asyncHandler(async (req: Request, res: Response) => {
                const game = echelleStore.get(routeParam(req.params, "gameId") ?? "");
                if (!game) return gameNotFound(res);
                res.status(200).json({status: "ok", data: {grid: game.puzzle, elapsedMs: Date.now() - game.createdAt}});
            }),

            // Body : { from, word } : le mot existe-t-il, et ne change-t-il qu'une lettre ?
            check: asyncHandler(async (req: Request, res: Response) => {
                const {from, word} = req.body ?? {};
                if (typeof from !== "string" || typeof word !== "string") return badRequest(res, "Les deux mots sont obligatoires");
                const next = normalizeWordInput(word);
                if (!isOneLetterApart(normalizeWordInput(from), next)) return badRequest(res, "Change exactement une lettre");
                if (!isAcceptedWord(next)) return badRequest(res, "Ce mot n'est pas dans le dictionnaire");
                res.status(200).json({status: "ok", data: {word: next}});
            }),

            // Body : { gameId, path } (mots du départ à l'arrivée)
            validate: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
                const {gameId, path} = req.body ?? {};
                if (typeof gameId !== "string") return badRequest(res, "La partie est obligatoire");
                const game = echelleStore.get(gameId);
                if (!game) return gameNotFound(res);
                if (!isEchelleSolution(game.puzzle, path)) {
                    tracker.failed(gameId);
                    return badRequest(res, "Ce chemin ne relie pas les deux mots");
                }
                echelleStore.delete(gameId);
                const durationMs = Date.now() - game.createdAt;
                tracker.finished(gameId, durationMs, res.locals.userId);
                const result = await reward("ECHELLE", res.locals.userId, durationMs, game.puzzle.length, game.puzzle.par, echelleXp, echelleCredits);
                res.status(200).json({status: "ok", data: result});
            }),
        },

        motsMeles: {
            settings: settingsOf("MOTSMELES", MOTS_MELES_DEFAULT_SIZE, MOTS_MELES_SIZES, motsMelesXp, motsMelesCredits),

            generate: asyncHandler(async (req: Request, res: Response) => {
                const settings = readSettings(req, MOTS_MELES_SIZES);
                if (!settings) return badRequest(res, "Réglages de partie non proposés");
                const puzzle = generateMotsMeles(settings.size, settings.amount, random);
                const gameId = motsMelesStore.create(puzzle, settings.amount);
                tracker.started(req, {gameId, gameCode: "MOTSMELES", mode: "free", gridSize: settings.size, emptyCells: settings.amount});
                res.status(200).json({status: "ok", data: {gameId, puzzle}});
            }),

            status: asyncHandler(async (req: Request, res: Response) => {
                const game = motsMelesStore.get(routeParam(req.params, "gameId") ?? "");
                if (!game) return gameNotFound(res);
                res.status(200).json({status: "ok", data: {grid: game.puzzle, elapsedMs: Date.now() - game.createdAt}});
            }),

            // Body : { gameId, found: [{ word, from, to }] } (cases de début et de fin de chaque mot)
            validate: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
                const {gameId, found} = req.body ?? {};
                if (typeof gameId !== "string") return badRequest(res, "La partie est obligatoire");
                const game = motsMelesStore.get(gameId);
                if (!game) return gameNotFound(res);
                if (!isMotsMelesSolution(game.puzzle, found)) {
                    tracker.failed(gameId);
                    return badRequest(res, "Tous les mots ne sont pas trouvés");
                }
                motsMelesStore.delete(gameId);
                const durationMs = Date.now() - game.createdAt;
                tracker.finished(gameId, durationMs, res.locals.userId);
                const result = await reward("MOTSMELES", res.locals.userId, durationMs, game.puzzle.size, game.puzzle.words.length, motsMelesXp, motsMelesCredits);
                res.status(200).json({status: "ok", data: result});
            }),
        },

        motsACaser: {
            settings: settingsOf("MOTSACASER", MOTS_A_CASER_DEFAULT_SIZE, MOTS_A_CASER_SIZES, motsACaserXp, motsACaserCredits),

            generate: asyncHandler(async (req: Request, res: Response) => {
                const settings = readSettings(req, MOTS_A_CASER_SIZES);
                if (!settings) return badRequest(res, "Réglages de partie non proposés");
                const puzzle = generateMotsACaser(settings.size, settings.amount, random);
                const gameId = motsACaserStore.create(puzzle, settings.amount);
                tracker.started(req, {gameId, gameCode: "MOTSACASER", mode: "free", gridSize: settings.size, emptyCells: settings.amount});
                res.status(200).json({status: "ok", data: {gameId, puzzle: publicMotsACaser(puzzle)}});
            }),

            status: asyncHandler(async (req: Request, res: Response) => {
                const game = motsACaserStore.get(routeParam(req.params, "gameId") ?? "");
                if (!game) return gameNotFound(res);
                res.status(200).json({status: "ok", data: {grid: publicMotsACaser(game.puzzle), elapsedMs: Date.now() - game.createdAt}});
            }),

            // Body : { gameId, grid } (toute la grille ligne par ligne, « # » pour les cases noires)
            validate: asyncHandler(async (req: Request, res: Response<unknown, AuthLocals>) => {
                const {gameId, grid} = req.body ?? {};
                if (typeof gameId !== "string") return badRequest(res, "La partie est obligatoire");
                const game = motsACaserStore.get(gameId);
                if (!game) return gameNotFound(res);
                if (!isMotsACaserSolution(game.puzzle, grid)) {
                    tracker.failed(gameId);
                    return badRequest(res, "Les mots de la grille ne correspondent pas à la liste");
                }
                motsACaserStore.delete(gameId);
                const durationMs = Date.now() - game.createdAt;
                tracker.finished(gameId, durationMs, res.locals.userId);
                const result = await reward("MOTSACASER", res.locals.userId, durationMs, game.puzzle.size, game.cluesCount, motsACaserXp, motsACaserCredits);
                res.status(200).json({status: "ok", data: result});
            }),
        },
    };
}
