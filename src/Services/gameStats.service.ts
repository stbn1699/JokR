import {api} from "../api/api.ts";
import type {GameStats} from "../Models/gameStats.model.ts";

export const gameStatsService = {
    getStatsByUserId(userId: string) :Promise<GameStats[]> {
        return api<GameStats[]>(`/gameStats/user/${userId}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
    }
};