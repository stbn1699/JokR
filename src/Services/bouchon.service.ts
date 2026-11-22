import {api} from "../api/api.ts";
import type {GameStatus, WinResult} from "../Models/gameResult.model.ts";
import type {BouchonMove, BouchonPuzzle} from "../Models/bouchon.model.ts";
import type {WordGameSettings} from "../Models/wordGames.model.ts";

const json = {"Content-Type": "application/json"};

export const bouchonService = {
    // tailles, nombres de coups et XP de chaque réglage
    getSettings: (signal?: AbortSignal): Promise<WordGameSettings> => api<WordGameSettings>("/bouchon/settings", {method: "GET"}, signal),

    generate: (size: number, moves: number): Promise<{ gameId: string; puzzle: BouchonPuzzle }> =>
        api("/bouchon/generate", {method: "POST", headers: json, body: JSON.stringify({size, amount: moves})}),

    getGame: (gameId: string): Promise<GameStatus<BouchonPuzzle>> =>
        api(`/bouchon/games/${encodeURIComponent(gameId)}`, {method: "GET"}),

    // les coups joués, rejoués par le serveur
    validate: (gameId: string, moves: BouchonMove[]): Promise<WinResult> =>
        api<WinResult>("/bouchon/validate", {method: "POST", headers: json, body: JSON.stringify({gameId, moves})}),
};
