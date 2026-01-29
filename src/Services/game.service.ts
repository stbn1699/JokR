import {api} from "../api/api.ts";
import type {Game} from "../Models/game.model.ts";

export const gameService = {
    list(signal?: AbortSignal) {
        return api<Game[]>("/games/list/", { method: "GET" }, signal);
    },

    getBaseXp(gameCode: string) :Promise<number> {
        return api<number>(`/games/getBaseXp/${gameCode}`, { method: "GET" });
    }
};