import {api} from "../api/api.ts";
import type {User} from "../Models/user.model.ts";
import type {RecentResult} from "../Models/gameResult.model.ts";

export const userService = {
    // Profil du joueur connecté : répond 401 si le token est expiré
    getMe(): Promise<User> {
        return api<User>(`/users/me`, {method: "GET"});
    },

    // 10 dernières parties gagnées par le joueur connecté
    getMyResults(signal?: AbortSignal): Promise<RecentResult[]> {
        return api<RecentResult[]>(`/users/me/results`, {method: "GET"}, signal);
    },

    getByUserId(userId: string): Promise<User> {
        return api<User>(`/users/${userId}`, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
        });
    }
};