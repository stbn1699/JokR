import {api} from "../api/api.ts";
import type {StatsData, StatsExport} from "../Models/stats.model.ts";
import type {CasinoStatsData} from "../Models/casinoStats.model.ts";
import type {ShopStatsData} from "../Models/shopStats.model.ts";

export const statsService = {
    // Tous les chiffres de la page (403 si le joueur n'est pas administrateur)
    get(signal?: AbortSignal): Promise<StatsData> {
        return api<StatsData>("/stats", {method: "GET"}, signal);
    },

    // Onglet « Hasard » : Plinko et roulette
    casino(signal?: AbortSignal): Promise<CasinoStatsData> {
        return api<CasinoStatsData>("/stats/casino", {method: "GET"}, signal);
    },

    // Onglet « Boutique » : achats et fonds portés
    shop(signal?: AbortSignal): Promise<ShopStatsData> {
        return api<ShopStatsData>("/stats/shop", {method: "GET"}, signal);
    },

    // Données brutes, pour une analyse ailleurs
    export(): Promise<StatsExport> {
        return api<StatsExport>("/stats/export", {method: "GET"});
    },
};
