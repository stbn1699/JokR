import {api} from "../api/api.ts";
import type {ColoriaPuzzle} from "../Models/coloria.model.ts";
import type {GameStatus, WinResult} from "../Models/gameResult.model.ts";
import type {WordGameSettings} from "../Models/wordGames.model.ts";

const json = {"Content-Type": "application/json"};

export const coloriaService = {
    // nombres de zones et de couleurs proposés, avec l'XP de chacun
    getSettings: (signal?: AbortSignal): Promise<WordGameSettings> => api<WordGameSettings>("/coloria/settings", {method: "GET"}, signal),

    generate: (zones: number, colors: number): Promise<{ gameId: string; puzzle: ColoriaPuzzle }> =>
        api("/coloria/generate", {method: "POST", headers: json, body: JSON.stringify({size: zones, amount: colors})}),

    getGame: (gameId: string): Promise<GameStatus<ColoriaPuzzle>> =>
        api(`/coloria/games/${encodeURIComponent(gameId)}`, {method: "GET"}),

    validate: (gameId: string, colors: number[]): Promise<WinResult> =>
        api<WinResult>("/coloria/validate", {method: "POST", headers: json, body: JSON.stringify({gameId, colors})}),
};
