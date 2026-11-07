import {api} from "../api/api.ts";
import type {DailyStart} from "../Models/daily.model.ts";

// Défi reçu d'un·e ami·e (la grille de sa partie gagnée)
export interface FriendChallenge {
    challengeId: string;
    gameCode: string;
    gameName: string;
    gridSize: number;
    emptyCells: number;
    from: { username: string; avatar: string; level: number };
    // temps de l'ami·e
    senderMs: number;
    // ton temps (première réussite), null si tu ne l'as pas encore fait
    playerMs: number | null;
    createdAt: string;
}

// Résultat après avoir fini la grille : `first` = première réussite (comptée et annoncée à l'ami·e)
export type ChallengeResult = FriendChallenge & { playerMs: number; latestMs: number; first: boolean };

const json = {"Content-Type": "application/json"};

export const challengeService = {
    // Envoie la grille de sa dernière partie gagnée sur ce jeu (moins de 24 h) à des amis
    async send(gameCode: string, friends: string[]): Promise<number> {
        const {sent} = await api<{ sent: number }>("/challenges", {method: "POST", headers: json, body: JSON.stringify({gameCode, friends})});
        return sent;
    },

    // Défie des amis au défi du jour (déjà réussi)
    async sendDaily(gameCode: string, friends: string[]): Promise<number> {
        const {sent} = await api<{ sent: number }>("/challenges/daily", {method: "POST", headers: json, body: JSON.stringify({gameCode, friends})});
        return sent;
    },

    get(challengeId: string, signal?: AbortSignal): Promise<FriendChallenge> {
        return api<FriendChallenge>(`/challenges/${encodeURIComponent(challengeId)}`, {method: "GET"}, signal);
    },

    // Lance une partie avec la grille du défi (même forme qu'un défi du jour)
    start<Grid>(challengeId: string): Promise<DailyStart<Grid>> {
        return api<DailyStart<Grid>>(`/challenges/${encodeURIComponent(challengeId)}/start`, {method: "POST"});
    },

    result(challengeId: string): Promise<ChallengeResult> {
        return api<ChallengeResult>(`/challenges/${encodeURIComponent(challengeId)}/result`, {method: "POST"});
    },
};

// Adresse d'un défi reçu
export const challengePath = (challengeId: string) => `/defi-ami/${encodeURIComponent(challengeId)}`;
