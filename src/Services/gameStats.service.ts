import {api} from "../api/api.ts";
import type {GameStats} from "../Models/gameStats.model.ts";

export const gameStatsService = {
    gameWin(userId: string, gameCode: string) {
        api<GameStats>("/gameStats/gameWin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: userId,
                game_code: gameCode,
            }),
        });
    },

    getStatsByUserId(userId: string) :Promise<GameStats[]> {
        return api<GameStats[]>(`/gameStats/user/${userId}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
    }
};