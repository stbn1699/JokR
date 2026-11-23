import {api} from "../api/api.ts";
import type {GameStatus, WinResult} from "../Models/gameResult.model.ts";
import type {BouclePuzzle} from "../Models/boucle.model.ts";
import type {WordGameSettings} from "../Models/wordGames.model.ts";

const json = {"Content-Type": "application/json"};

export const boucleService = {
    // tailles, nombres de murs et XP de chaque réglage
    getSettings: (signal?: AbortSignal): Promise<WordGameSettings> => api<WordGameSettings>("/boucle/settings", {method: "GET"}, signal),

    generate: (size: number, walls: number): Promise<{ gameId: string; puzzle: BouclePuzzle }> =>
        api("/boucle/generate", {method: "POST", headers: json, body: JSON.stringify({size, amount: walls})}),

    getGame: (gameId: string): Promise<GameStatus<BouclePuzzle>> =>
        api(`/boucle/games/${encodeURIComponent(gameId)}`, {method: "GET"}),

    // les cases de la boucle, dans l'ordre
    validate: (gameId: string, loop: number[]): Promise<WinResult> =>
        api<WinResult>("/boucle/validate", {method: "POST", headers: json, body: JSON.stringify({gameId, loop})}),
};
