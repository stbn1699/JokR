import {api} from "../api/api.ts";
import type {Game} from "../Models/game.model.ts";

export const gameService = {
    list(signal?: AbortSignal) {
        return api<Game[]>("/games/list/", {method: "GET"}, signal);
    },

    getBaseXp(gameCode: string): Promise<number> {
        return api<number>(`/games/getBaseXp/${gameCode}`, {method: "GET"});
    },

    // nouvelle méthode : demande au backend une grille Sudoku
    async generateSudoku(cluesCount: number): Promise<number[][]> {
        const res = await api<{ grid: number[][] }>(`/sudoku/generateSudoku`, {
            method: "POST",
            body: JSON.stringify({cluesCount}),
            headers: {"Content-Type": "application/json"}
        });
        return res.grid;
    },

    // valider une grille complète côté serveur (optionellement enregistrer la victoire)
    async validateSudoku(grid: number[][], userId?: string | null, gameCode?: string, xp?: number): Promise<void> {
        await api<void>(`/sudoku/validateSudoku`, {
            method: "POST",
            body: JSON.stringify({grid, user_id: userId, game_code: gameCode, xp}),
            headers: {"Content-Type": "application/json"}
        });
    }
};