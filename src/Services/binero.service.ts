import {api} from "../api/api.ts";
import type {BineroCell, BineroSettings} from "../Models/bineroSettings.model.ts";
import type {GameStatus, WinResult} from "../Models/gameResult.model.ts";

const json = {"Content-Type": "application/json"};

export const bineroService = {
    // tailles proposées, plages de cases à remplir et XP pour chacune
    getSettings(signal?: AbortSignal): Promise<BineroSettings> {
        return api<BineroSettings>("/binero/settings", {method: "GET"}, signal);
    },

    // nouvelle grille (null = case à remplir) ; gameId identifie la partie pour la validation
    generate(size: number, emptyCells: number): Promise<{ gameId: string; grid: BineroCell[][] }> {
        return api("/binero/generate", {method: "POST", headers: json, body: JSON.stringify({size, emptyCells})});
    },

    // partie en cours côté serveur (grille de départ, temps écoulé) ; 404 si elle n'existe plus
    getGame(gameId: string): Promise<GameStatus<BineroCell[][]>> {
        return api(`/binero/games/${encodeURIComponent(gameId)}`, {method: "GET"});
    },

    // valide la grille côté serveur : temps de la partie, et XP / record si le joueur est connecté
    validate(gameId: string, grid: number[][]): Promise<WinResult> {
        return api<WinResult>("/binero/validate", {
            method: "POST",
            headers: json,
            body: JSON.stringify({gameId, grid}),
        });
    },
};
