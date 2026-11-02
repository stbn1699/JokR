import {api} from "../api/api.ts";
import type {GalaxiesPuzzle, GalaxiesSettings} from "../Models/galaxies.model.ts";
import type {GameStatus, WinResult} from "../Models/gameResult.model.ts";

const json = {"Content-Type": "application/json"};

export const galaxiesService = {
    // tailles proposées, plages de murs donnés et XP pour chacune
    getSettings(signal?: AbortSignal): Promise<GalaxiesSettings> {
        return api<GalaxiesSettings>("/galaxies/settings", {method: "GET"}, signal);
    },

    // nouvelle grille ; gameId identifie la partie pour la validation
    generate(size: number, hints: number): Promise<{ gameId: string; puzzle: GalaxiesPuzzle }> {
        return api("/galaxies/generate", {method: "POST", headers: json, body: JSON.stringify({size, hints})});
    },

    // partie en cours côté serveur (grille de départ, temps écoulé) ; 404 si elle n'existe plus
    getGame(gameId: string): Promise<GameStatus<GalaxiesPuzzle>> {
        return api(`/galaxies/games/${encodeURIComponent(gameId)}`, {method: "GET"});
    },

    // valide le découpage (numéro du point de chaque case) : temps, et XP / record si le joueur est connecté
    validate(gameId: string, regions: number[]): Promise<WinResult> {
        return api<WinResult>("/galaxies/validate", {
            method: "POST",
            headers: json,
            body: JSON.stringify({gameId, regions}),
        });
    },
};
