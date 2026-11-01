import {api} from "../api/api.ts";
import type {User} from "../Models/user.model.ts";

export const userService = {
    // Profil du joueur connecté : répond 401 si le token est expiré
    getMe(): Promise<User> {
        return api<User>(`/users/me`, {method: "GET"});
    },

    getByUserId(userId: string): Promise<User> {
        return api<User>(`/users/${userId}`, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
        });
    }
};