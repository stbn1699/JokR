import {api} from "../api/api";
import type {LoggedUser} from "../Models/loggedUser.model.ts";

const TOKEN_KEY = "auth_token";
const USER_ID_KEY = "userId";

export const authService = {
    // avatar : graine de l'icône choisie (voir Services/avatar.ts)
    async register(username: string, email: string, password: string, avatar?: string) {
        return api("/users/register", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({username, email, password, avatar}),
        });
    },

    async login(identifier: string, password: string): Promise<LoggedUser> {
        return api("/users/login", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({identifier, password}),
        });
    },

    // Session persistée entre deux visites (le niveau et l'XP sont rechargés depuis le serveur)
    saveSession(token: string, userId: string) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_ID_KEY, userId);
    },

    getSession(): { token: string; userId: string } | null {
        const token = localStorage.getItem(TOKEN_KEY);
        const userId = localStorage.getItem(USER_ID_KEY);
        return token && userId ? {token, userId} : null;
    },

    getToken(): string | null {
        return localStorage.getItem(TOKEN_KEY);
    },

    clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_ID_KEY);
        // anciennes clés, plus utilisées
        localStorage.removeItem("userLevel");
        localStorage.removeItem("userXp");
    },
};
