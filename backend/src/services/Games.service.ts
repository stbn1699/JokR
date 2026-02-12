import type {Game} from "../models/Game.model.js";
import {GamesRepository} from "../repository/Games.repository.js";

/*
 * Service métier pour les jeux
 * - Coordonne l'accès aux données via GamesRepository
 * - Applique éventuellement des règles métier (actuellement pass-through)
 */
export class GamesService {
    constructor(private repo: GamesRepository) {
    }

    // Retourne la liste des jeux
    async listGames(): Promise<Game[]> {
        return this.repo.list();
    }

    // Retourne le base XP d'un jeu
    async getBaseXp(gameCode: string): Promise<number | undefined> {
        return this.repo.getBaseXp(gameCode);
    }
}
