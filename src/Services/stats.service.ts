import {api} from "../api/api.ts";
import type {StatsData, StatsExport} from "../Models/stats.model.ts";
import type {CasinoStatsData} from "../Models/casinoStats.model.ts";
import type {ShopStatsData} from "../Models/shopStats.model.ts";
import type {QuizzStatsData} from "../Models/quizzStats.model.ts";
import {filterQuery, type StatsFilter} from "../Components/Stats/statsFilter.ts";

export const statsService = {
    // Tous les chiffres de la page (403 si le joueur n'est pas administrateur), filtrés par période et par jeu
    get(filter: StatsFilter, signal?: AbortSignal): Promise<StatsData> {
        return api<StatsData>(`/stats${filterQuery(filter)}`, {method: "GET"}, signal);
    },

    // Rubrique « Hasard » : tous les jeux
    casino(filter: StatsFilter, signal?: AbortSignal): Promise<CasinoStatsData> {
        return api<CasinoStatsData>(`/stats/casino${filterQuery(filter)}`, {method: "GET"}, signal);
    },

    // Onglet « Boutique » : achats et fonds portés (filtre de période seulement)
    shop(filter: StatsFilter, signal?: AbortSignal): Promise<ShopStatsData> {
        return api<ShopStatsData>(`/stats/shop${filterQuery({...filter, game: null})}`, {method: "GET"}, signal);
    },

    // Rubrique « Quizz » : parties, réponses, banque des questions des joueurs (filtre de période seulement)
    quizz(filter: StatsFilter, signal?: AbortSignal): Promise<QuizzStatsData> {
        return api<QuizzStatsData>(`/stats/quizz${filterQuery({...filter, game: null})}`, {method: "GET"}, signal);
    },

    // Données brutes, pour une analyse ailleurs
    export(): Promise<StatsExport> {
        return api<StatsExport>("/stats/export", {method: "GET"});
    },
};
