import {api} from "../api/api.ts";
import type {GameStatus, WinResult} from "../Models/gameResult.model.ts";
import type {DevimotAnswer, DevimotPuzzle, EchellePuzzle, FoundWord, MotsACaserPuzzle, MotsMelesPuzzle, WordGameSettings} from "../Models/wordGames.model.ts";

const json = {"Content-Type": "application/json"};
const post = <T>(path: string, body: unknown): Promise<T> => api<T>(path, {method: "POST", headers: json, body: JSON.stringify(body)});

// Routes communes aux trois jeux : réglages, nouvelle partie, partie en cours
const gameRoutes = <P>(base: string) => ({
    getSettings: (signal?: AbortSignal): Promise<WordGameSettings> => api<WordGameSettings>(`${base}/settings`, {method: "GET"}, signal),
    generate: (size: number, amount: number): Promise<{ gameId: string; puzzle: P }> => post(`${base}/generate`, {size, amount}),
    getGame: (gameId: string): Promise<GameStatus<P>> => api(`${base}/games/${encodeURIComponent(gameId)}`, {method: "GET"}),
});

export const devimotService = {
    ...gameRoutes<DevimotPuzzle>("/devimot"),
    guess: (gameId: string, word: string) => post<DevimotAnswer>("/devimot/guess", {gameId, word}),
};

export const echelleService = {
    ...gameRoutes<EchellePuzzle>("/echelle"),
    check: (from: string, word: string) => post<{ word: string }>("/echelle/check", {from, word}),
    validate: (gameId: string, path: string[]) => post<WinResult>("/echelle/validate", {gameId, path}),
};

export const motsMelesService = {
    ...gameRoutes<MotsMelesPuzzle>("/mots-meles"),
    validate: (gameId: string, found: FoundWord[]) => post<WinResult>("/mots-meles/validate", {gameId, found}),
};

export const motsACaserService = {
    ...gameRoutes<MotsACaserPuzzle>("/mots-a-caser"),
    validate: (gameId: string, grid: string) => post<WinResult>("/mots-a-caser/validate", {gameId, grid}),
};
