import {api} from "../api/api.ts";

// Profil public d'un joueur (GET /players/:username)
export interface PlayerProfile {
    username: string;
    avatar: string;
    level: number;
    xp: number;
    credits: number;
    createdAt: string;
    // Place au classement XP globale
    xpRank: { rank: number; total: number } | null;
    // Victoires, tous jeux confondus
    wins: number;
    // Tous les jeux, même jamais gagnés (les plus joués d'abord) ; meilleur temps avec la grille de cette partie
    games: {
        code: string;
        name: string;
        level: number;
        xp: number;
        wins: number;
        bestMs: number | null;
        bestGridSize: number | null;
        bestEmptyCells: number | null;
    }[];
    // Défis du jour réussis, et gagnés (meilleur temps du jour)
    daily: { completions: number; firsts: number };
    // Dernières victoires
    recent: { code: string; name: string; gridSize: number; emptyCells: number; durationMs: number; finishedAt: string }[];
}

export const playerService = {
    profile(username: string, signal?: AbortSignal): Promise<PlayerProfile> {
        return api<PlayerProfile>(`/players/${encodeURIComponent(username)}`, {method: "GET"}, signal);
    },
};

// Adresse de la page d'un joueur
export const playerPath = (username: string) => `/joueur/${encodeURIComponent(username)}`;
