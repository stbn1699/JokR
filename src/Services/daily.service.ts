import {api} from "../api/api.ts";
import type {DailyLeaderboard, DailyMonth, DailyOverview, DailyStart} from "../Models/daily.model.ts";

const code = (gameCode: string) => encodeURIComponent(gameCode.toLowerCase());

export const dailyService = {
    // Défis du jour et résultats du joueur connecté
    overview(signal?: AbortSignal): Promise<DailyOverview> {
        return api<DailyOverview>("/daily", {method: "GET"}, signal);
    },

    // Commence le défi du jour (ou indique qu'il est déjà réussi aujourd'hui)
    start<Grid>(gameCode: string): Promise<DailyStart<Grid>> {
        return api<DailyStart<Grid>>(`/daily/${code(gameCode)}/start`, {method: "POST"});
    },

    // Classement du jour, ou d'un jour passé si `date` est donnée (AAAA-MM-JJ)
    // friendsOnly : seulement le joueur connecté et ses amis, avec leur place parmi tous
    leaderboard(gameCode: string, signal?: AbortSignal, date?: string, friendsOnly = false): Promise<DailyLeaderboard> {
        const params = new URLSearchParams();
        if (date) params.set("date", date);
        if (friendsOnly) params.set("amis", "1");
        const query = params.size > 0 ? `?${params}` : "";
        return api<DailyLeaderboard>(`/daily/${code(gameCode)}/leaderboard${query}`, {method: "GET"}, signal);
    },

    // Défis d'un mois (AAAA-MM, mois courant par défaut) et résultats du joueur connecté
    history(month?: string, signal?: AbortSignal): Promise<DailyMonth> {
        const query = month ? `?month=${encodeURIComponent(month)}` : "";
        return api<DailyMonth>(`/daily/history${query}`, {method: "GET"}, signal);
    },

    // Rejoue le défi d'un jour passé : partie normale (XP normale, hors classement du jour)
    async replay<Grid>(gameCode: string, date: string): Promise<DailyStart<Grid>> {
        const game = await api<{ date: string; gameId: string; grid: Grid; size: number; emptyCells: number }>(
            `/daily/${code(gameCode)}/replay/${encodeURIComponent(date)}`, {method: "POST"});
        return {...game, alreadyDone: false};
    },
};

// "2026-11-01" → "1er novembre"
export function formatDailyDate(date: string): string {
    const [year, month, day] = date.split("-").map(Number);
    const d = new Date(Date.UTC(year!, month! - 1, day!));
    const label = d.toLocaleDateString("fr-FR", {day: "numeric", month: "long", timeZone: "UTC"});
    return day === 1 ? label.replace(/^1 /, "1er ") : label;
}
