import {api} from "../api/api.ts";
import type {RikudoPuzzle, RikudoSettings} from "../Models/rikudo.model.ts";
import type {GameStatus, WinResult} from "../Models/gameResult.model.ts";

const json = {"Content-Type": "application/json"};

export const rikudoService = {
    // tailles proposées, plages de cases à remplir et XP pour chacune
    getSettings(signal?: AbortSignal): Promise<RikudoSettings> {
        return api<RikudoSettings>("/rikudo/settings", {method: "GET"}, signal);
    },

    // nouvelle grille ; gameId identifie la partie pour la validation
    generate(size: number, emptyCells: number): Promise<{ gameId: string; puzzle: RikudoPuzzle }> {
        return api("/rikudo/generate", {method: "POST", headers: json, body: JSON.stringify({size, emptyCells})});
    },

    // partie en cours côté serveur (grille de départ, temps écoulé) ; 404 si elle n'existe plus
    getGame(gameId: string): Promise<GameStatus<RikudoPuzzle>> {
        return api(`/rikudo/games/${encodeURIComponent(gameId)}`, {method: "GET"});
    },

    // valide la grille côté serveur (un nombre par case) : temps, et XP / record si le joueur est connecté
    validate(gameId: string, values: number[]): Promise<WinResult> {
        return api<WinResult>("/rikudo/validate", {
            method: "POST",
            headers: json,
            body: JSON.stringify({gameId, values}),
        });
    },
};
