import {api} from "../api/api.ts";
import type {User} from "../../backend/src/models/User.model.ts";

export const userService = {
    getByUserId(userId: string): Promise<User> {
        return api<User>(`/users/${userId}`, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
        });
    }
};