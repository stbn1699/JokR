import {api} from "../api/api.ts";
import type {GameStatus, WinResult} from "../Models/gameResult.model.ts";
import type {DemineurPuzzle, DemineurReveal} from "../Models/demineur.model.ts";
import type {WordGameSettings} from "../Models/wordGames.model.ts";

const json = {"Content-Type": "application/json"};

export const demineurService = {
    // tailles, nombres de mines et XP de chaque réglage
    getSettings: (signal?: AbortSignal): Promise<WordGameSettings> => api<WordGameSettings>("/demineur/settings", {method: "GET"}, signal),

    generate: (size: number, mines: number): Promise<{ gameId: string; puzzle: DemineurPuzzle }> =>
        api("/demineur/generate", {method: "POST", headers: json, body: JSON.stringify({size, amount: mines})}),

    getGame: (gameId: string): Promise<GameStatus<DemineurPuzzle>> =>
        api(`/demineur/games/${encodeURIComponent(gameId)}`, {method: "GET"}),

    // libère des cases : un clic, ou les voisines d'un chiffre entouré de ses drapeaux
    reveal: (gameId: string, cells: number[]): Promise<DemineurReveal> =>
        api<DemineurReveal>("/demineur/reveal", {method: "POST", headers: json, body: JSON.stringify({gameId, cells})}),

    validate: (gameId: string): Promise<WinResult> =>
        api<WinResult>("/demineur/validate", {method: "POST", headers: json, body: JSON.stringify({gameId})}),
};
