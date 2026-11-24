import type {Response} from "express";
import type {AuthLocals} from "../middleware/auth.js";
import type {GamesService} from "./Games.service.js";
import type {ProgressionService} from "./Progression.service.js";
import {DAILY_REWARD_MULTIPLIER, type DailyService} from "./Daily.service.js";
import type {StoredPuzzle} from "./PuzzleStore.js";
import {gridGame, type GridGameCode} from "./gridGames.js";
import {tracker} from "./tracker.js";
import {recordLevelWin} from "./levelWin.js";
import {LevelsRepository} from "../repository/Levels.repository.js";
import {createDb} from "../db/kysely.js";
import {pool} from "../db/pool.js";

export type GridWinDeps = { progression: ProgressionService; games: GamesService; daily: DailyService };

// Progression du mode Niveaux (créée au premier niveau réussi)
let levelsRepository: LevelsRepository | null = null;
const levels = () => (levelsRepository ??= new LevelsRepository(createDb(pool)));

/*
 * Fin d'une partie gagnée d'un jeu de grille ajouté depuis 3.3 (la grille vient d'être reconnue juste) :
 * la partie est retirée (pas de double validation), le temps est mesuré par le serveur, et le joueur connecté
 * reçoit son XP et ses crédits. Défi du jour : seule la première réussite compte, avec des gains doublés.
 * Mode Niveaux : la réussite du niveau est enregistrée, et seule la première rapporte de l'XP et des crédits.
 */
export async function finishGridWin(
    res: Response<unknown, AuthLocals>, code: GridGameCode, gameId: string, game: StoredPuzzle<unknown>, deps: GridWinDeps,
) {
    res.status(200).json({status: "ok", data: await gridWinResult(code, gameId, game, res.locals.userId, deps)});
}

// Même chose, sans répondre : le résultat de la victoire (gains, défi du jour)
export async function gridWinResult(code: GridGameCode, gameId: string, game: StoredPuzzle<unknown>, userId: string | undefined, deps: GridWinDeps) {
    const def = gridGame(code);
    def.store.delete(gameId);
    const durationMs = Date.now() - game.createdAt;
    tracker.finished(gameId, durationMs, userId);
    if (!userId) return {xp: undefined, durationMs};

    if (game.level) {
        return recordLevelWin(levels(), deps.progression, code, game.level, userId, durationMs, async () => {
            const baseXp = await deps.games.getBaseXp(code) ?? 0;
            return {
                xp: def.xp(baseXp, game.puzzle, game.cluesCount), credits: def.credits(game.puzzle, game.cluesCount),
                gridSize: def.gridSize(game.puzzle), emptyCells: game.cluesCount,
            };
        });
    }

    const daily = game.daily ? await deps.daily.recordResult(code, game.daily, userId, durationMs) : undefined;
    if (daily && !daily.counted) return {xp: undefined, durationMs, daily};

    const multiplier = daily?.counted ? DAILY_REWARD_MULTIPLIER : 1;
    const baseXp = await deps.games.getBaseXp(code) ?? 0;
    const xp = def.xp(baseXp, game.puzzle, game.cluesCount) * multiplier;
    const credits = def.credits(game.puzzle, game.cluesCount) * multiplier;
    const gridSize = def.gridSize(game.puzzle);
    const {personalBest, xp: xpWon, credits: creditsWon, streak} = await deps.progression.recordWin(userId, code, xp, {
        gridSize, emptyCells: game.cluesCount, durationMs,
    }, credits);
    return {xp: xpWon, credits: creditsWon, rewardMultiplier: multiplier, durationMs, personalBest, streak, daily};
}
