import {api} from "../api/api.ts";
import type {GameStatus, WinResult} from "../Models/gameResult.model.ts";
import type {LiensPuzzle} from "../Models/liens.model.ts";
import type {WordGameSettings} from "../Models/wordGames.model.ts";

const json = {"Content-Type": "application/json"};

export const liensService = {
    // tailles, nombres de paires et XP de chaque réglage
    getSettings: (signal?: AbortSignal): Promise<WordGameSettings> => api<WordGameSettings>("/liens/settings", {method: "GET"}, signal),

    generate: (size: number, pairs: number): Promise<{ gameId: string; puzzle: LiensPuzzle }> =>
        api("/liens/generate", {method: "POST", headers: json, body: JSON.stringify({size, amount: pairs})}),

    getGame: (gameId: string): Promise<GameStatus<LiensPuzzle>> =>
        api(`/liens/games/${encodeURIComponent(gameId)}`, {method: "GET"}),

    // la ligne de chaque paire, case par case
    validate: (gameId: string, paths: number[][]): Promise<WinResult> =>
        api<WinResult>("/liens/validate", {method: "POST", headers: json, body: JSON.stringify({gameId, paths})}),
};
