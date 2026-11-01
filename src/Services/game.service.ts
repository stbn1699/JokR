import {api} from "../api/api.ts";
import type {Game} from "../Models/game.model.ts";
import type {SudokuSettings} from "../Models/sudokuSettings.model.ts";
import type {GameStatus, WinResult} from "../Models/gameResult.model.ts";

export const gameService = {
    list(signal?: AbortSignal) {
        return api<Game[]>("/games/list", {method: "GET"}, signal);
    },

    // plage de cases vides proposée et XP gagnée pour chaque valeur
    getSudokuSettings(signal?: AbortSignal): Promise<SudokuSettings> {
        return api<SudokuSettings>(`/sudoku/settings`, {method: "GET"}, signal);
    },

    // demande au backend une grille Sudoku ; gameId identifie la partie pour la validation
    generateSudoku(cluesCount: number): Promise<{ gameId: string; grid: number[][] }> {
        return api<{ gameId: string; grid: number[][] }>(`/sudoku/generateSudoku`, {
            method: "POST",
            body: JSON.stringify({cluesCount}),
            headers: {"Content-Type": "application/json"}
        });
    },

    // partie en cours côté serveur (grille de départ, temps écoulé) ; 404 si elle n'existe plus
    getSudokuGame(gameId: string): Promise<GameStatus<number[][]>> {
        return api<GameStatus<number[][]>>(`/sudoku/games/${encodeURIComponent(gameId)}`, {method: "GET"});
    },

    // valide la grille côté serveur : temps de la partie, et XP / record si l'utilisateur est connecté
    validateSudoku(gameId: string, grid: number[][]): Promise<WinResult> {
        return api<WinResult>(`/sudoku/validateSudoku`, {
            method: "POST",
            body: JSON.stringify({gameId, grid}),
            headers: {"Content-Type": "application/json"}
        });
    }
};