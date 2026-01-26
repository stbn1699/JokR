import { api } from "../api/api";
import type {LoggedUser} from "../Models/loggedUser.model.ts";

export const authService = {
    async register(username: string, email: string, password: string) {
        return api("/users/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password }),
        });
    },

    async login(identifier: string, password: string) :Promise<LoggedUser> {
        return api("/users/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier, password }),
        });
    },

    saveToken(token: string) {
        localStorage.setItem("auth_token", token);
    },
};

