import {api} from "../api/api.ts";
import type {Game} from "../Models/game.model.ts";
import type {SudokuSettings} from "../Models/sudokuSettings.model.ts";

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

    // valide la grille côté serveur ; si l'utilisateur est connecté, le serveur calcule
    // et enregistre l'XP (renvoyée dans la réponse)
    async validateSudoku(gameId: string, grid: number[][]): Promise<number | undefined> {
        const res = await api<{ xp?: number }>(`/sudoku/validateSudoku`, {
            method: "POST",
            body: JSON.stringify({gameId, grid}),
            headers: {"Content-Type": "application/json"}
        });
        return res.xp;
    }
};