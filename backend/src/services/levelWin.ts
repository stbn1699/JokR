import type {LevelsRepository} from "../repository/Levels.repository.js";
import type {ProgressionService} from "./Progression.service.js";
import {levelGame} from "../utils/levels.js";

export type LevelReward = { xp: number; credits: number; gridSize: number; emptyCells: number };

/*
 * Partie d'un niveau (mode Niveaux) réussie par un joueur connecté : la réussite du niveau est enregistrée, et l'XP et
 * les crédits ne sont donnés qu'à la première réussite. Renvoie les données de la réponse de validation, avec
 * `level: { level, first, tutorialDone }` (tutorialDone : ce niveau termine le tutoriel, première fois).
 * `reward` calcule l'XP et les crédits du jeu (appelé seulement à la première réussite).
 */
export async function recordLevelWin(
    levels: LevelsRepository,
    progression: ProgressionService,
    gameCode: string,
    levelNumber: number,
    userId: string,
    durationMs: number,
    reward: () => Promise<LevelReward>,
) {
    const {first} = await levels.complete(userId, gameCode, levelNumber, durationMs);
    const level = {level: levelNumber, first, tutorialDone: first && levelNumber === levelGame(gameCode)?.tutorial};
    if (!first) return {xp: undefined, durationMs, level};
    const {xp, credits, gridSize, emptyCells} = await reward();
    const {personalBest} = await progression.recordWin(userId, gameCode, xp, {gridSize, emptyCells, durationMs}, credits);
    return {xp, credits, rewardMultiplier: 1, durationMs, personalBest, level};
}
