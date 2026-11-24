import type {Response} from "express";
import type {AuthLocals} from "../middleware/auth.js";
import type {GamesService} from "./Games.service.js";
import type {ProgressionService} from "./Progression.service.js";
import {DAILY_REWARD_MULTIPLIER, type DailyService} from "./Daily.service.js";
import type {StoredPuzzle} from "./PuzzleStore.js";
import {gridGame, type GridGameCode} from "./gridGames.js";
import {tracker} from "./tracker.js";

export type GridWinDeps = { progression: ProgressionService; games: GamesService; daily: DailyService };

/*
 * Fin d'une partie gagnée d'un jeu de grille ajouté depuis 3.3 (la grille vient d'être reconnue juste) :
 * la partie est retirée (pas de double validation), le temps est mesuré par le serveur, et le joueur connecté
 * reçoit son XP et ses crédits. Défi du jour : seule la première réussite compte, avec des gains doublés.
 */
export async function finishGridWin(
    res: Response<unknown, AuthLocals>, code: GridGameCode, gameId: string, game: StoredPuzzle<unknown>, deps: GridWinDeps,
) {
    const def = gridGame(code);
    def.store.delete(gameId);
    const durationMs = Date.now() - game.createdAt;
    const userId = res.locals.userId;
    tracker.finished(gameId, durationMs, userId);
    if (!userId) {
        res.status(200).json({status: "ok", data: {xp: undefined, durationMs}});
        return;
    }

    const daily = game.daily ? await deps.daily.recordResult(code, game.daily, userId, durationMs) : undefined;
    if (daily && !daily.counted) {
        res.status(200).json({status: "ok", data: {xp: undefined, durationMs, daily}});
        return;
    }

    const multiplier = daily?.counted ? DAILY_REWARD_MULTIPLIER : 1;
    const baseXp = await deps.games.getBaseXp(code) ?? 0;
    const xp = def.xp(baseXp, game.puzzle, game.cluesCount) * multiplier;
    const credits = def.credits(game.puzzle, game.cluesCount) * multiplier;
    const gridSize = def.gridSize(game.puzzle);
    const {personalBest, xp: xpWon, credits: creditsWon, streak} = await deps.progression.recordWin(userId, code, xp, {
        gridSize, emptyCells: game.cluesCount, durationMs,
    }, credits);
    res.status(200).json({status: "ok", data: {xp: xpWon, credits: creditsWon, rewardMultiplier: multiplier, durationMs, personalBest, streak, daily}});
}
