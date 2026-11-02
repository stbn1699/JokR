import {api} from "../api/api.ts";
import type {StatsData, StatsExport} from "../Models/stats.model.ts";

export const statsService = {
    // Tous les chiffres de la page (403 si le joueur n'est pas administrateur)
    get(signal?: AbortSignal): Promise<StatsData> {
        return api<StatsData>("/stats", {method: "GET"}, signal);
    },

    // Données brutes, pour une analyse ailleurs
    export(): Promise<StatsExport> {
        return api<StatsExport>("/stats/export", {method: "GET"});
    },
};
