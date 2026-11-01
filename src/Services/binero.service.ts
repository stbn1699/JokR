import {api} from "../api/api.ts";
import type {BineroCell, BineroSettings} from "../Models/bineroSettings.model.ts";

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

    // valide la grille côté serveur ; si le joueur est connecté, le serveur enregistre l'XP
    async validate(gameId: string, grid: number[][]): Promise<number | undefined> {
        const res = await api<{ xp?: number }>("/binero/validate", {
            method: "POST",
            headers: json,
            body: JSON.stringify({gameId, grid}),
        });
        return res.xp;
    },
};
