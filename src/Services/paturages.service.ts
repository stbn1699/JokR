import {api} from "../api/api.ts";
import type {GameStatus, WinResult} from "../Models/gameResult.model.ts";
import type {PaturagesPuzzle, PaturagesSquare} from "../Models/paturages.model.ts";
import type {WordGameSettings} from "../Models/wordGames.model.ts";

const json = {"Content-Type": "application/json"};

export const paturagesService = {
    // tailles, carrés donnés et XP de chaque réglage
    getSettings: (signal?: AbortSignal): Promise<WordGameSettings> => api<WordGameSettings>("/paturages/settings", {method: "GET"}, signal),

    generate: (size: number, given: number): Promise<{ gameId: string; puzzle: PaturagesPuzzle }> =>
        api("/paturages/generate", {method: "POST", headers: json, body: JSON.stringify({size, amount: given})}),

    getGame: (gameId: string): Promise<GameStatus<PaturagesPuzzle>> =>
        api(`/paturages/games/${encodeURIComponent(gameId)}`, {method: "GET"}),

    // le découpage complet du pré
    validate: (gameId: string, squares: PaturagesSquare[]): Promise<WinResult> =>
        api<WinResult>("/paturages/validate", {method: "POST", headers: json, body: JSON.stringify({gameId, squares})}),
};
