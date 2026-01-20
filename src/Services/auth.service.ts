import { api } from "../api/api";

const TOKEN_KEY = "auth_token";

export const authService = {
    async register(username: string, email: string, password: string) {
        return api("/users/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password }),
        });
    },

    async login(identifier: string, password: string) {
        return api("/users/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier, password }),
        });
    },

    saveToken(token: string) {
        localStorage.setItem(TOKEN_KEY, token);
    },

    getToken() {
        return localStorage.getItem(TOKEN_KEY);
    },

    clearToken() {
        localStorage.removeItem(TOKEN_KEY);
    }
};

