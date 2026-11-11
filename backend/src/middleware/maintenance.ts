import type {NextFunction, Request, Response} from "express";
import {maintenance, MAINTENANCE_MESSAGE} from "../services/maintenance.js";

// Requêtes qui lancent une nouvelle partie de puzzle : nouvelle grille, défi du jour (ou rejoué), défi d'un ami
const NEW_GAME = /^\/(?:sudoku\/generateSudoku|(?:binero|rikudo|tectonic|galaxies|shikaku|queens)\/generate|daily\/[^/]+\/(?:start|replay\/[^/]+)|challenges\/[^/]+\/start)\/?$/;

export const isNewGameRequest = (method: string, path: string): boolean => method === "POST" && NEW_GAME.test(path);

/*
 * Mode maintenance (services/maintenance.ts) : refuse les nouvelles parties de puzzle avec un 503
 * et code « maintenance » (le site affiche le message). Les parties déjà commencées se valident normalement.
 * Placé sur le routeur de l'API, avant les routes des jeux.
 */
export function blockNewGames(req: Request, res: Response, next: NextFunction) {
    if (maintenance.blocksNewGames() && isNewGameRequest(req.method, req.path)) {
        res.status(503).json({status: "error", code: "maintenance", message: MAINTENANCE_MESSAGE});
        return;
    }
    next();
}
