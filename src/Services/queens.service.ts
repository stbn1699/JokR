import {api} from "../api/api.ts";
import type {QueensPuzzle, QueensSettings} from "../Models/queens.model.ts";
import type {GameStatus, WinResult} from "../Models/gameResult.model.ts";

const json = {"Content-Type": "application/json"};

export const queensService = {
    // tailles proposées, plages de dames données et XP pour chacune
    getSettings(signal?: AbortSignal): Promise<QueensSettings> {
        return api<QueensSettings>("/queens/settings", {method: "GET"}, signal);
    },

    // nouvelle grille ; gameId identifie la partie pour la validation
    generate(size: number, hints: number): Promise<{ gameId: string; puzzle: QueensPuzzle }> {
        return api("/queens/generate", {method: "POST", headers: json, body: JSON.stringify({size, hints})});
    },

    // partie en cours côté serveur (grille de départ, temps écoulé) ; 404 si elle n'existe plus
    getGame(gameId: string): Promise<GameStatus<QueensPuzzle>> {
        return api(`/queens/games/${encodeURIComponent(gameId)}`, {method: "GET"});
    },

    // valide les dames (case de chaque dame) : temps, et XP / record si le joueur est connecté
    validate(gameId: string, queens: number[]): Promise<WinResult> {
        return api<WinResult>("/queens/validate", {
            method: "POST",
            headers: json,
            body: JSON.stringify({gameId, queens}),
        });
    },
};
