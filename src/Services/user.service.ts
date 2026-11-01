import {api} from "../api/api.ts";
import type {User} from "../Models/user.model.ts";

export const userService = {
    getByUserId(userId: string): Promise<User> {
        return api<User>(`/users/${userId}`, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
        });
    }
};