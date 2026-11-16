import {api} from "../api/api.ts";
import type {TracePuzzle, TraceSettings} from "../Models/trace.model.ts";
import type {GameStatus, WinResult} from "../Models/gameResult.model.ts";

const json = {"Content-Type": "application/json"};

export const traceService = {
    // tailles proposées, plages de numéros donnés en plus et XP pour chacune
    getSettings(signal?: AbortSignal): Promise<TraceSettings> {
        return api<TraceSettings>("/trace/settings", {method: "GET"}, signal);
    },

    // nouvelle grille ; gameId identifie la partie pour la validation
    generate(size: number, hints: number): Promise<{ gameId: string; puzzle: TracePuzzle }> {
        return api("/trace/generate", {method: "POST", headers: json, body: JSON.stringify({size, hints})});
    },

    // partie en cours côté serveur (grille de départ, temps écoulé) ; 404 si elle n'existe plus
    getGame(gameId: string): Promise<GameStatus<TracePuzzle>> {
        return api(`/trace/games/${encodeURIComponent(gameId)}`, {method: "GET"});
    },

    // valide le chemin (cases dans l'ordre) : temps, et XP / record si le joueur est connecté
    validate(gameId: string, path: number[]): Promise<WinResult> {
        return api<WinResult>("/trace/validate", {method: "POST", headers: json, body: JSON.stringify({gameId, path})});
    },
};
