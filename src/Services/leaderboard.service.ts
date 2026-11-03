import {api} from "../api/api.ts";

export interface LeaderboardEntry {
    rank: number;
    username: string;
    // graine de l'icône de profil
    avatar: string;
    // niveau global du joueur (contour de son icône)
    userLevel: number;
    // niveau sur ce classement : global (XP) ou sur le jeu
    level: number;
    xp: number;
    // Seulement pour le classement d'un jeu
    gamesWon?: number;
    // Seulement pour le classement des crédits
    credits?: number;
}

export interface Leaderboard {
    entries: LeaderboardEntry[];
    // Place du joueur connecté (null si invité ou jamais classé)
    me: { rank: number; total: number; level: number; xp?: number; gamesWon?: number; credits?: number } | null;
}

export const leaderboardService = {
    // Classement par XP globale
    xp(signal?: AbortSignal): Promise<Leaderboard> {
        return api<Leaderboard>("/leaderboard/xp", {method: "GET"}, signal);
    },

    // Classement par crédits (ceux que le joueur a en ce moment)
    credits(signal?: AbortSignal): Promise<Leaderboard> {
        return api<Leaderboard>("/leaderboard/credits", {method: "GET"}, signal);
    },

    // Classement d'un jeu (niveau / XP sur ce jeu)
    game(gameCode: string, signal?: AbortSignal): Promise<Leaderboard> {
        return api<Leaderboard>(`/leaderboard/games/${encodeURIComponent(gameCode.toLowerCase())}`, {method: "GET"}, signal);
    },
};
