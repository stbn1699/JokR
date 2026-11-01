import {api} from "../api/api.ts";
import type {User} from "../Models/user.model.ts";
import type {RecentResult} from "../Models/gameResult.model.ts";
import {clientHash} from "./hash.ts";

export const userService = {
    // Profil du joueur connecté : répond 401 si le token est expiré
    getMe(): Promise<User> {
        return api<User>(`/users/me`, {method: "GET"});
    },

    // Parties gagnées par le joueur connecté, les plus récentes d'abord (par pages)
    getMyResults(limit = 10, offset = 0, signal?: AbortSignal): Promise<RecentResult[]> {
        return api<RecentResult[]>(`/users/me/results?limit=${limit}&offset=${offset}`, {method: "GET"}, signal);
    },

    // Les mots de passe sont hachés dans le navigateur, comme à la connexion
    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        await api(`/users/me/password`, {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                currentPassword: await clientHash(currentPassword),
                newPassword: await clientHash(newPassword),
            }),
        });
    },

    // Suppression définitive du compte (mot de passe requis)
    async deleteAccount(password: string): Promise<void> {
        await api(`/users/me`, {
            method: "DELETE",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({password: await clientHash(password)}),
        });
    },

    getByUserId(userId: string): Promise<User> {
        return api<User>(`/users/${userId}`, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
        });
    }
};