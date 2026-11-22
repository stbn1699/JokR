import {api} from "../api/api.ts";
import type {GameStatus, WinResult} from "../Models/gameResult.model.ts";
import type {TuyauxPuzzle} from "../Models/tuyaux.model.ts";
import type {WordGameSettings} from "../Models/wordGames.model.ts";

const json = {"Content-Type": "application/json"};

export const tuyauxService = {
    // tailles, cases données possibles et XP de chaque réglage
    getSettings: (signal?: AbortSignal): Promise<WordGameSettings> => api<WordGameSettings>("/tuyaux/settings", {method: "GET"}, signal),

    generate: (size: number, hints: number): Promise<{ gameId: string; puzzle: TuyauxPuzzle }> =>
        api("/tuyaux/generate", {method: "POST", headers: json, body: JSON.stringify({size, amount: hints})}),

    getGame: (gameId: string): Promise<GameStatus<TuyauxPuzzle>> =>
        api(`/tuyaux/games/${encodeURIComponent(gameId)}`, {method: "GET"}),

    // quarts de tour (0 à 3) de chaque pièce
    validate: (gameId: string, turns: number[]): Promise<WinResult> =>
        api<WinResult>("/tuyaux/validate", {method: "POST", headers: json, body: JSON.stringify({gameId, turns})}),
};
