import {api} from "../api/api.ts";
import type {DailyLeaderboard, DailyOverview, DailyStart} from "../Models/daily.model.ts";

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

    leaderboard(gameCode: string, signal?: AbortSignal): Promise<DailyLeaderboard> {
        return api<DailyLeaderboard>(`/daily/${code(gameCode)}/leaderboard`, {method: "GET"}, signal);
    },
};

// "2026-11-01" → "1er novembre"
export function formatDailyDate(date: string): string {
    const [year, month, day] = date.split("-").map(Number);
    const d = new Date(Date.UTC(year!, month! - 1, day!));
    const label = d.toLocaleDateString("fr-FR", {day: "numeric", month: "long", timeZone: "UTC"});
    return day === 1 ? label.replace(/^1 /, "1er ") : label;
}
