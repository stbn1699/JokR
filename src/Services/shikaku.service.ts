import {api} from "../api/api.ts";
import type {ShikakuPuzzle, ShikakuSettings} from "../Models/shikaku.model.ts";
import type {GameStatus, WinResult} from "../Models/gameResult.model.ts";

const json = {"Content-Type": "application/json"};

export const shikakuService = {
    // tailles proposées, plages de rectangles donnés et XP pour chacune
    getSettings(signal?: AbortSignal): Promise<ShikakuSettings> {
        return api<ShikakuSettings>("/shikaku/settings", {method: "GET"}, signal);
    },

    // nouvelle grille ; gameId identifie la partie pour la validation
    generate(size: number, hints: number): Promise<{ gameId: string; puzzle: ShikakuPuzzle }> {
        return api("/shikaku/generate", {method: "POST", headers: json, body: JSON.stringify({size, hints})});
    },

    // partie en cours côté serveur (grille de départ, temps écoulé) ; 404 si elle n'existe plus
    getGame(gameId: string): Promise<GameStatus<ShikakuPuzzle>> {
        return api(`/shikaku/games/${encodeURIComponent(gameId)}`, {method: "GET"});
    },

    // valide le découpage (numéro du nombre de chaque case) : temps, et XP / record si le joueur est connecté
    validate(gameId: string, regions: number[]): Promise<WinResult> {
        return api<WinResult>("/shikaku/validate", {
            method: "POST",
            headers: json,
            body: JSON.stringify({gameId, regions}),
        });
    },
};
